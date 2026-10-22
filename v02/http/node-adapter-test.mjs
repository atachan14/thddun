import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readNodeRequest, writeFetchResponse } from './node-adapter.mjs';

const url = new URL('https://adapter.invalid/api/check');
const toFetchRequest = async (req, res, url) => { const init = await readNodeRequest(req, res); return init ? new Request(url, init) : null; };
const response = () => ({ status: null, headers: null, body: null,
  writeHead(status, headers) { this.status = status; this.headers = headers; },
  end(body) { this.body = body; },
});
for (const body of ['日本語', Buffer.from('日本語'), { name: '日本語', n: 0 }, null]) {
  const req = { method: 'POST', headers: { 'x-many': ['a', 'b'], ignored: undefined }, body };
  const r = await toFetchRequest(req, response(), url);
  assert.equal(r.method, 'POST');
  assert.equal(r.headers.get('x-many'), 'a,b');
  assert.equal(r.headers.has('ignored'), false);
  assert.equal(await r.text(), typeof body === 'string' ? body : Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body));
}
const streamed = Readable.from([Buffer.from('日'), Buffer.from('本語')]);
Object.assign(streamed, { method: 'PATCH', headers: {} });
assert.equal(await (await toFetchRequest(streamed, response(), url)).text(), '日本語');
for (const body of [Buffer.alloc(32768), Buffer.alloc(32769), '日'.repeat(10923)]) {
  const res = response(), r = await toFetchRequest({ method: 'POST', headers: {}, body }, res, url);
  if (Buffer.byteLength(body) <= 32768) assert.equal((await r.arrayBuffer()).byteLength, 32768);
  else { assert.equal(r, null); assert.equal(res.status, 413); assert.equal(res.body, 'Request too large'); }
}
const oversized = Readable.from([Buffer.alloc(16000), Buffer.alloc(17000)]);
Object.assign(oversized, { method: 'POST', headers: {} });
const limitResponse = response();
assert.equal(await toFetchRequest(oversized, limitResponse, url), null);
assert.equal(limitResponse.status, 413);
for (const method of ['GET', 'HEAD']) {
  const r = await toFetchRequest({ method, headers: {}, body: 'ignored' }, response(), url);
  assert.equal(r.body, null);
}
const headers = new Headers({ 'Content-Type': 'application/json', 'X-Test': 'retained' });
headers.append('Set-Cookie', 'one=x; Secure; HttpOnly');
headers.append('Set-Cookie', 'two=y; Secure; SameSite=Strict');
const out = response();
await writeFetchResponse(out, new Response('{"ok":true}', { status: 201, headers }));
assert.equal(out.status, 201); assert.equal(out.body, '{"ok":true}');
assert.deepEqual(out.headers['set-cookie'], ['one=x; Secure; HttpOnly', 'two=y; Secure; SameSite=Strict']);
assert.equal(out.headers['x-test'], 'retained');
console.log('PASS shared Node HTTP conversion: exact UTF-8/body bytes, streamed/preparsed/boundary rejection, GET/HEAD, independent Set-Cookie values and response metadata. No DB or credentials.');
