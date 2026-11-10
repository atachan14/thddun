import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readWorkspaceFolder } from "../local/fs-source.js";

test("_ と . で始まるフォルダには入らない", async () => {
  const root = await mkdtemp(join(tmpdir(), "thddun-fs-"));
  try {
    await mkdir(join(root, "dev"));
    await mkdir(join(root, "_private"));
    await mkdir(join(root, ".git"));
    await writeFile(join(root, "dev", "_topic.md"), "---\nid: x\n---\n");
    await writeFile(join(root, "dev", "a.md"), "a");
    await writeFile(join(root, "dev", "_memo.md"), "memo");
    await writeFile(join(root, "dev", "image.png"), "png");
    await writeFile(join(root, "_private", "secret.md"), "secret");
    await writeFile(join(root, ".git", "x.md"), "git");
    await writeFile(join(root, "_thddun.md"), "---\nassignees: [me]\n---\n");

    const result = await readWorkspaceFolder(root);
    assert.deepEqual(result.dirs, ["dev"]);
    assert.deepEqual(result.files.map((f) => f.path).sort(), ["dev/_topic.md", "dev/a.md"]);
    assert.equal(result.settingsText, "---\nassignees: [me]\n---\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
