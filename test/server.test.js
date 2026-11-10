import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";

function get(port, path, host = `127.0.0.1:${port}`) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, headers: { host } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("Workspace を読んで返し、ほかの宛先からは断る", async () => {
  const dir = await mkdtemp(join(tmpdir(), "thddun-server-"));
  process.env.THDDUN_REGISTRY = join(dir, "workspaces.json");
  const { addWorkspace } = await import("../local/registry.js");
  const { createThddunServer } = await import("../local/server.js");

  const content = join(dir, "content");
  await mkdir(join(content, "dev"), { recursive: true });
  await writeFile(join(content, "dev", "_topic.md"), '---\nid: "20261110-100000-aaaa"\n---\n');
  await writeFile(join(content, "dev", "one.md"), '---\nid: "20261110-100000-bbbb"\n---\n本文');
  await addWorkspace({ name: "sample", path: content, readonly: true });

  const server = createThddunServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    const list = await get(port, "/api/workspaces");
    assert.equal(list.status, 200);
    assert.deepEqual(JSON.parse(list.body), { workspaces: [{ name: "sample", readonly: true }] });

    const ws = await get(port, "/api/workspaces/sample");
    assert.equal(ws.status, 200);
    const data = JSON.parse(ws.body);
    assert.deepEqual(data.topics.map((t) => t.title).sort(), ["dev", "one"]);

    assert.equal((await get(port, "/api/workspaces/none")).status, 404);
    assert.equal((await get(port, "/api/workspaces", "evil.example:80")).status, 403);
    assert.equal((await get(port, "/core/../package.json")).status, 404);
    assert.equal((await get(port, "/core/ids.js")).status, 200);
  } finally {
    server.close();
    delete process.env.THDDUN_REGISTRY;
    await rm(dir, { recursive: true, force: true });
  }
});
