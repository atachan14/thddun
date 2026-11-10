// Workspace の設定(一番上の _thddun.md の先頭の項目)を読む。
//
// 例:
//   ---
//   assignees:
//     - me
//     - claude-opus-5.5
//   states: [未着手, 進行中, 保留, 完了]
//   done: [完了]
//   ---
//
// _thddun.md がなければ既定の設定になる。kb には置かない。

import { splitFrontmatter } from "./frontmatter.js";

export const SETTINGS_FILE = "_thddun.md";

export const DEFAULT_STATES = ["未着手", "進行中", "保留", "完了"];
export const DEFAULT_DONE_STATES = ["完了"];

function asList(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * @param {string | null} text  _thddun.md の中身(なければ null)
 * @returns {{ assignees: string[], states: string[], doneStates: string[], found: boolean, warnings: string[] }}
 */
export function parseSettings(text) {
  const warnings = [];
  if (text === null || text === undefined) {
    return {
      assignees: [],
      states: [...DEFAULT_STATES],
      doneStates: [...DEFAULT_DONE_STATES],
      found: false,
      warnings,
    };
  }

  const { meta } = splitFrontmatter(text);
  const data = meta ?? {};
  if (meta === null) warnings.push(`${SETTINGS_FILE} に先頭の項目(--- で囲んだ部分)がない`);

  const states = asList(data.states);
  const doneStates = asList(data.done);
  const result = {
    assignees: asList(data.assignees),
    states: states.length > 0 ? states : [...DEFAULT_STATES],
    doneStates: doneStates.length > 0 ? doneStates : [...DEFAULT_DONE_STATES],
    found: true,
    warnings,
  };
  for (const s of result.doneStates) {
    if (!result.states.includes(s)) warnings.push(`done にある「${s}」が states にない`);
  }
  return result;
}
