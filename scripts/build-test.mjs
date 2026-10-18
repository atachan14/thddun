import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
async function snapshot(directory, prefix = '') {
  const result = {};
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'public', '.build'].includes(entry.name)) continue;
    const rel = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(result, await snapshot(path.join(directory, entry.name), rel + '/'));
    else result[rel] = hash(await fs.readFile(path.join(directory, entry.name)));
  }
  return result;
}
async function artifacts(directory) {
  return Object.fromEntries(await Promise.all((await fs.readdir(directory)).sort().map(async file =>
    [file, hash(await fs.readFile(path.join(directory, file)))])));
}
const before = await snapshot(root);
// Hard fail outbound network during the build, including accidental DB sockets.
const guard = `import net from 'node:net';import http from 'node:http';import https from 'node:https';
const blocked=()=>{throw Error('Network forbidden during build');};
globalThis.fetch=blocked;net.Socket.prototype.connect=blocked;http.request=blocked;https.request=blocked;`;
const args = ['--import', 'data:text/javascript,' + encodeURIComponent(guard), 'scripts/build.mjs'];
const run = () => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true,
  env: { ...process.env, DATABASE_URL: 'BUILD_TEST_SECRET_SENTINEL', NEON_AUTH_BASE_URL: 'BUILD_TEST_AUTH_SENTINEL' } });
const first = run();
assert.equal(first.status, 0, first.stderr);
const publicBefore = await artifacts(path.join(root, 'public'));
const buildBefore = await artifacts(path.join(root, '.build'));
const second = run();
assert.equal(second.status, 0, second.stderr);
assert.deepEqual(await artifacts(path.join(root, 'public')), publicBefore);
assert.deepEqual(await artifacts(path.join(root, '.build')), buildBefore);
assert.deepEqual(await snapshot(root), before);
const inputs = JSON.parse(await fs.readFile(path.join(root, '.build/inputs.json'), 'utf8'));
assert(!inputs.browser.some(file => /app\.mjs|file-client|ledger|fixture|fake-postgres/.test(file)));
assert(!inputs.server.some(file => /fixture|fake-postgres|seed|prepare|manifest/.test(file)));
const html = await fs.readFile(path.join(root, 'public/index.html'), 'utf8');
assert(html.includes('src="/shell.js"') && !html.includes('src="/app-entry.mjs"'));
for (const directory of ['public', '.build']) {
  for (const file of await fs.readdir(path.join(root, directory))) {
    const body = await fs.readFile(path.join(root, directory, file), 'utf8');
    assert(!body.includes('BUILD_TEST_SECRET_SENTINEL') && !body.includes('BUILD_TEST_AUTH_SENTINEL'));
    assert(!file.endsWith('.map'));
  }
}
// Exercise the compiled handler with no auth/DB access, independently of Vercel.
const { trialNodeHandler } = await import(pathToFileURL(path.join(root, '.build/api.mjs')));
const handler = trialNodeHandler({});
const response = () => ({ code: null, body: '', writeHead(code) { this.code = code; }, end(body) { this.body = body; } });
const res = response();
await handler({ headers: { host: 'test.invalid' }, method: 'GET', url: '/api/v02/snapshot?workspace=demo' }, res);
assert.equal(res.code, 503); // Missing environment fails closed, without connecting.
assert(!res.body.includes('SENTINEL'));
console.log('PASS reproducible build twice with outbound networking blocked; sources unchanged, secrets absent, source closure clean, licenses retained, compiled API fails closed.');
