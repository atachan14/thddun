// Workspace の一覧(パソコンごとの設定)。リポジトリには入れず、ユーザーのフォルダに置く。
// Windows: %APPDATA%\thddun\workspaces.json、ほか: ~/.config/thddun/workspaces.json
// 環境変数 THDDUN_REGISTRY で場所を変えられる(テスト用)。

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

export function registryPath() {
  if (process.env.THDDUN_REGISTRY) return process.env.THDDUN_REGISTRY;
  const base = process.env.APPDATA ?? join(homedir(), ".config");
  return join(base, "thddun", "workspaces.json");
}

/** @returns {Promise<{ name: string, path: string, readonly: boolean }[]>} */
export async function loadWorkspaces(file = registryPath()) {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const data = JSON.parse(text);
  return (data.workspaces ?? []).map((w) => ({ name: String(w.name), path: String(w.path), readonly: Boolean(w.readonly) }));
}

async function save(workspaces, file) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ workspaces }, null, 2) + "\n", "utf8");
}

/** 追加する。同じ名前があれば置き換える。 */
export async function addWorkspace({ name, path, readonly }, file = registryPath()) {
  if (!name || !path) throw new Error("名前とパスが必要");
  const workspaces = (await loadWorkspaces(file)).filter((w) => w.name !== name);
  workspaces.push({ name, path: resolve(path), readonly: Boolean(readonly) });
  await save(workspaces, file);
  return workspaces;
}

export async function removeWorkspace(name, file = registryPath()) {
  const before = await loadWorkspaces(file);
  const workspaces = before.filter((w) => w.name !== name);
  await save(workspaces, file);
  return before.length !== workspaces.length;
}
