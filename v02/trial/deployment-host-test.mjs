import assert from 'node:assert/strict';
import { PROJECT_ID, PRODUCTION_HOST, PRODUCTION_DOMAIN, deploymentHosts } from './deployment-hosts.mjs';
import { trialNodeHandler } from './node-handler.mjs';
import { createTrialApplication } from './application.mjs';

const generated = 'thdmn-nextbuild1-aklius14pg-8355s-projects.vercel.app';
const previous = 'thdmn-acmqcj34i-aklius14pg-8355s-projects.vercel.app';
const other = 'other-nextbuild1-aklius14pg-8355s-projects.vercel.app';
const env = { VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: PROJECT_ID,
  VERCEL_URL: generated, VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_DOMAIN,
  NEON_AUTH_BASE_URL: 'https://auth.example.invalid/db/auth' };
const invoke = async (handler, { host = PRODUCTION_HOST, url = '/api/v02/environment',
  method = 'GET', headers = {}, body = {} } = {}) => {
  const response = { status: null, body: '', writeHead(status) { this.status = status; },
    end(body) { this.body = body || ''; } };
  await handler({ method, url, headers: { host, ...headers }, body }, response);
  return response;
};
const handler = trialNodeHandler(env);
assert.deepEqual([...deploymentHosts(env)], [generated, PRODUCTION_HOST, PRODUCTION_DOMAIN]);
for (const host of [generated, PRODUCTION_HOST, PRODUCTION_DOMAIN]) {
  assert.equal((await invoke(handler, { host })).status, 200);
  assert.equal((await invoke(handler, { host, url: '/api/v02/snapshot?workspace=demo' })).status, 401);
  assert.equal((await invoke(handler, { host, url: '/api/v02/commands', method: 'POST',
    headers: { origin: 'https://' + host, 'content-type': 'application/json' } })).status, 401);
}
for (const host of [previous, other, 'evil.invalid', PRODUCTION_HOST + '.evil.invalid',
  PRODUCTION_HOST + ':443', PRODUCTION_HOST.toUpperCase(), ['evil.invalid', PRODUCTION_HOST], undefined]) {
  assert.equal((await invoke(handler, { headers: { host } })).status, 403);
}
for (const headers of [
  { 'x-forwarded-host': PRODUCTION_HOST, 'x-forwarded-proto': 'https' },
  { forwarded: `host=${PRODUCTION_HOST};proto=https` },
  { 'x-vercel-deployment-url': generated, 'x-vercel-forwarded-for': '127.0.0.1' }
]) assert.equal((await invoke(handler, { host: other, headers })).status, 403);
// Proxy headers cannot change which origin is used on an otherwise valid request.
assert.equal((await invoke(handler, { headers: { 'x-forwarded-host': 'evil.invalid',
  forwarded: 'host=evil.invalid;proto=http' } })).status, 200);
for (const origin of ['https://evil.invalid', 'https://' + generated, 'https://' + PRODUCTION_DOMAIN, 'null',
  'http://' + PRODUCTION_HOST, 'https://' + PRODUCTION_HOST + '.evil.invalid']) {
  for (const method of ['GET', 'POST']) {
    assert.equal((await invoke(handler, { method, headers: { origin },
      url: method === 'POST' ? '/api/v02/commands' : '/api/v02/environment' })).status, 403);
  }
}
for (const url of ['https://evil.invalid/api/v02/environment', '//evil.invalid/api/v02/environment',
  'https://' + generated + '/api/v02/environment', 'https://user@' + PRODUCTION_HOST + '/api/v02/environment']) {
  assert.equal((await invoke(handler, { url })).status, 403);
}
for (const patch of [
  { VERCEL_PROJECT_ID: 'prj_other' }, { VERCEL_PROJECT_ID: undefined },
  { VERCEL_PROJECT_PRODUCTION_URL: other }, { VERCEL_PROJECT_PRODUCTION_URL: undefined },
  { VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_HOST },
  { VERCEL_PROJECT_PRODUCTION_URL: 'https://' + PRODUCTION_HOST },
  { VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_HOST + '.evil.invalid' },
  { VERCEL_URL: other }, { VERCEL_URL: PRODUCTION_HOST }, { VERCEL_URL: generated + ':443' }
]) {
  assert.equal(deploymentHosts({ ...env, ...patch }), null);
  assert.equal((await invoke(trialNodeHandler({ ...env, ...patch }))).status, 503);
}
const preview = trialNodeHandler({ ...env, VERCEL_ENV: 'preview' });
assert.equal((await invoke(preview)).status, 403);
assert.equal((await invoke(preview, { host: PRODUCTION_DOMAIN })).status, 403);
assert.equal((await invoke(preview, { host: generated })).status, 200);
assert.equal(deploymentHosts({ VERCEL_URL: generated }), null);

// Independent Fetch application boundary has the same exact-host and Origin rules.
let opens = 0;
const app = createTrialApplication({ env, openPool() { opens++; throw Error('No DB permitted'); } });
for (const host of [PRODUCTION_HOST, PRODUCTION_DOMAIN, generated]) {
  assert.equal((await app(new Request('https://' + host + '/api/v02/environment'))).status, 200);
  assert.equal((await app(new Request('https://' + host + '/api/v02/snapshot?workspace=demo'))).status, 401);
}
for (const url of ['https://' + other + '/api/v02/environment',
  'http://' + PRODUCTION_HOST + '/api/v02/environment']) {
  assert.equal((await app(new Request(url))).status, 403);
}
assert.equal((await app(new Request('https://' + PRODUCTION_HOST + '/api/v02/environment',
  { headers: { origin: 'https://' + generated, 'x-forwarded-host': PRODUCTION_HOST } }))).status, 403);
assert.equal(opens, 0);
console.log('PASS exact existing Production alias + current deployment only; project/config fail-closed, stale/foreign Host and Origin denied, forwarded/absolute-target spoofing denied, Preview cannot claim Production alias, anonymous remains 401. Synthetic config; no DB/network.');
