// ローカルのフォルダから、コアに渡すファイルの一覧を集める。
// `_` と `.` で始まるフォルダ(_private/ など)には入らず、中身も読まない。

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { isIgnoredName, TOPIC_FILE, SETTINGS_FILE } from "../core/index.js";

async function readIfExists(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * @param {string} root  Workspace のフォルダ
 * @returns {Promise<{ dirs: string[], files: {path: string, text: string}[], settingsText: string | null }>}
 */
export async function readWorkspaceFolder(root) {
  const dirs = [];
  const files = [];

  async function walk(relative) {
    const absolute = relative === "" ? root : join(root, ...relative.split("/"));
    const entries = await readdir(absolute, { withFileTypes: true });
    for (const entry of entries) {
      const rel = relative === "" ? entry.name : `${relative}/${entry.name}`;
      // リンクはたどらない(Workspace の外を読まないため)
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (isIgnoredName(entry.name)) continue;
        dirs.push(rel);
        await walk(rel);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        if (isIgnoredName(entry.name) && entry.name !== TOPIC_FILE) continue;
        files.push({ path: rel, text: await readFile(join(absolute, entry.name), "utf8") });
      }
    }
  }

  await walk("");
  const settingsText = await readIfExists(join(root, SETTINGS_FILE));
  return { dirs, files, settingsText };
}
