// Workspace の一覧を編集する。
//   npm run workspace -- list
//   npm run workspace -- add <名前> <フォルダ> [--readonly]
//   npm run workspace -- remove <名前>

import { stat } from "node:fs/promises";
import { addWorkspace, loadWorkspaces, registryPath, removeWorkspace } from "./registry.js";

const [command, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith("--")));
const args = rest.filter((a) => !a.startsWith("--"));

function printList(workspaces) {
  console.log(`一覧のファイル: ${registryPath()}`);
  if (workspaces.length === 0) console.log("(登録なし)");
  for (const w of workspaces) console.log(`- ${w.name}: ${w.path}${w.readonly ? "(読み取り専用)" : ""}`);
}

async function main() {
  if (command === "list" || command === undefined) {
    printList(await loadWorkspaces());
  } else if (command === "add" && args.length === 2) {
    const [name, path] = args;
    const info = await stat(path).catch(() => null);
    if (!info?.isDirectory()) throw new Error(`フォルダがない: ${path}`);
    printList(await addWorkspace({ name, path, readonly: flags.has("--readonly") }));
  } else if (command === "remove" && args.length === 1) {
    if (!(await removeWorkspace(args[0]))) console.log(`${args[0]} は登録されていない`);
    printList(await loadWorkspaces());
  } else {
    console.log("使い方: list | add <名前> <フォルダ> [--readonly] | remove <名前>");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
