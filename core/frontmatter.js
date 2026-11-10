// 先頭の項目(フロントマター)を読む。
// kb の _tools/kb.py と同じ範囲だけを読む: 1階層の「キー: 値」と、
// 値が空のキーに続く「- 項目」形式のリスト、[a, b] 形式の1行のリスト。
// ファイルシステムには触らない(ブラウザでも同じように動かすため)。

/** 値の後ろの「 # コメント」を外す。引用符の中の # はそのまま。 */
function stripComment(value) {
  let out = "";
  let quote = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#" && (i === 0 || /\s/.test(value[i - 1]))) {
      break;
    }
    out += ch;
  }
  return out.trim();
}

function unquote(value) {
  const v = value.trim();
  if (v.length >= 2 && v[0] === v[v.length - 1] && (v[0] === '"' || v[0] === "'")) {
    return v.slice(1, -1);
  }
  return v;
}

function parseValue(raw) {
  const v = stripComment(raw);
  if (v === "" || v === "null" || v === "~") return null;
  if (v.startsWith("[") && v.endsWith("]")) {
    return v
      .slice(1, -1)
      .split(",")
      .filter((item) => item.trim() !== "")
      .map(unquote);
  }
  return unquote(v);
}

const LIST_ITEM = /^\s*-\s+(.*)$/;

/** フロントマターの中身(--- の間)を、キーと値の組にする。 */
export function parseFrontmatter(text) {
  const data = {};
  let listKey = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;

    const item = line.match(LIST_ITEM);
    if (item && listKey !== null) {
      const value = parseValue(item[1]);
      if (value !== null) data[listKey] = [...(data[listKey] ?? []), value];
      continue;
    }

    listKey = null;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    data[key] = parseValue(line.slice(colon + 1));
    // 値が空なら、次の行から「- 項目」が続くかもしれない
    if (data[key] === null) listKey = key;
  }
  return data;
}

/**
 * ファイルの中身を、フロントマターと本文に分ける。
 * フロントマターがなければ meta は null。
 */
export function splitFrontmatter(text) {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split("\n");
  if (lines.length > 0 && lines[0].trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        return {
          meta: parseFrontmatter(lines.slice(1, i).join("\n")),
          body: lines.slice(i + 1).join("\n"),
        };
      }
    }
  }
  return { meta: null, body: clean };
}
