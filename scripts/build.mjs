import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Build-time inputs are source and installed dependencies only. Never import the app.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public');
const reviewOutput = path.join(root, '.build');
const common = { absWorkingDir: root, bundle: true, minify: true, sourcemap: false,
  legalComments: 'external', metafile: true, write: false, logLevel: 'silent' };
const browser = await build({ ...common, entryPoints: ['v02/ui/shell-entry.mjs'],
  outfile: 'public/shell.js', platform: 'browser', format: 'esm', target: 'es2022' });
// Offline test artifact. Vercel's Node builder uses the committed api/index.mjs entry.
const server = await build({ ...common, entryPoints: ['api/index.mjs'],
  outfile: '.build/api.mjs', platform: 'node', format: 'esm', target: 'node24' });
const inputs = Object.keys({ ...browser.metafile.inputs, ...server.metafile.inputs });
for (const input of inputs.filter(input => !input.includes('node_modules'))) {
  if (/(?:^|\/)(?:runtime|samples)(?:\/|$)|(?:fixture|fake-postgres|test|prepare|manifest)\./.test(input)) {
    throw Error('Non-runtime source entered a deployment bundle: ' + input);
  }
}
const packages = new Map();
for (const input of inputs.filter(input => input.includes('node_modules'))) {
  let directory = path.dirname(path.resolve(root, input));
  while (directory !== path.dirname(directory)) {
    let pkg;
    try { pkg = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8')); }
    catch { directory = path.dirname(directory); continue; }
    if (!pkg.name || !pkg.version) { directory = path.dirname(directory); continue; }
    const key = pkg.name + '@' + pkg.version;
    if (!packages.has(key)) {
      const notices = [];
      for (const file of (await fs.readdir(directory)).sort()) {
        if (/^(licen[sc]e|copying|notice)(\.|$)/i.test(file)) {
          notices.push({ file, text: await fs.readFile(path.join(directory, file), 'utf8') });
        }
      }
      if (!['MIT', 'Apache-2.0', '0BSD'].includes(pkg.license) || !notices.length) {
        throw Error('License review required: ' + key);
      }
      packages.set(key, { name: pkg.name, version: pkg.version, license: pkg.license, notices });
    }
    break;
  }
}
for (const directory of [output, reviewOutput]) {
  try { if ((await fs.lstat(directory)).isSymbolicLink()) throw Error('Output symlink forbidden'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(directory, { recursive: true });
}
const html = (await fs.readFile(path.join(root, 'index.html'), 'utf8'));
if (!html.includes('src="/app-entry.mjs"')) throw Error('Unexpected HTML entry');
const artifacts = new Map([
  ['index.html', html.replace('src="/app-entry.mjs"', 'src="/shell.js"')],
  ['THIRD_PARTY_NOTICES.json', JSON.stringify([...packages.values()].sort((a, b) => a.name.localeCompare(b.name)), null, 2) + '\n']
]);
for (const file of ['style.css', 'simple.css', 'menu-pane.css', 'site-layout.css']) {
  artifacts.set(file, await fs.readFile(path.join(root, file)));
}
for (const file of browser.outputFiles) artifacts.set(path.basename(file.path), file.contents);
const allowed = [...artifacts.keys()].sort();
for (const existing of await fs.readdir(output)) {
  if (!allowed.includes(existing)) throw Error('Unexpected stale public artifact: ' + existing);
}
for (const [file, bytes] of artifacts) await fs.writeFile(path.join(output, file), bytes);
for (const file of server.outputFiles) await fs.writeFile(path.join(reviewOutput, path.basename(file.path)), file.contents);
await fs.writeFile(path.join(reviewOutput, 'inputs.json'), JSON.stringify({
  browser: Object.keys(browser.metafile.inputs).filter(p => !p.includes('node_modules')),
  server: Object.keys(server.metafile.inputs).filter(p => !p.includes('node_modules')),
  publicFiles: allowed, licenses: [...packages.values()].map(({ name, version, license }) => ({ name, version, license }))
}, null, 2) + '\n');
console.log(`Built ${artifacts.size} public files; ${packages.size} dependency notices. No DB, seed or deployment operation.`);
