// 権限を確かめる入口。すべての読み書きはここを通す。
// ローカル版では全部許可で、読み取り専用の Workspace への書き込みだけを拒否する。
// 公開版で権限が必要になったら、この関数を差し替える。

/** @typedef {{ name: string }} Actor  操作する人(自分か、どの AI か) */

export const READ = "read";
export const WRITE = "write";

/**
 * @param {Actor} actor
 * @param {typeof READ | typeof WRITE} action
 * @param {{ name: string, readonly: boolean }} workspace
 * @returns {{ allowed: true } | { allowed: false, reason: string }}
 */
export function checkPermission(actor, action, workspace) {
  if (!actor || !actor.name) return { allowed: false, reason: "操作する人が分からない" };
  if (action === WRITE && workspace.readonly) {
    return { allowed: false, reason: `${workspace.name} は読み取り専用` };
  }
  return { allowed: true };
}
