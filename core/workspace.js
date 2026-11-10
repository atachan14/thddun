// Workspace のファイルの一覧から、Topic・親子・前提・関連を組み立てる。
// ファイルシステムには触らない。ファイルを集めるのは呼ぶ側(ローカル版なら local/fs-source.js)。

import { splitFrontmatter } from "./frontmatter.js";
import { isId } from "./ids.js";
import { parseSettings, SETTINGS_FILE } from "./settings.js";
import { findRequireCycles } from "./graph.js";
import { computeStatuses } from "./status.js";

export const TOPIC_FILE = "_topic.md";

/**
 * Topic として読まない名前。`_` と `.` で始まるもの(_private/、_files/、.git など)。
 * ファイルを集める側も、これで中を読まずに飛ばす。
 */
export function isIgnoredName(name) {
  return name.startsWith("_") || name.startsWith(".");
}

function basename(path) {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

function dirname(path) {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function compareCodepoints(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function asList(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

/** 「担当者: 状態」を読む。状態が書いていなければ、最初の状態にする。 */
function parseAssignees(value, settings) {
  return asList(value).map((entry) => {
    const colon = entry.indexOf(":");
    if (colon === -1) return { name: entry.trim(), state: settings.states[0] };
    return { name: entry.slice(0, colon).trim(), state: entry.slice(colon + 1).trim() || settings.states[0] };
  });
}

/**
 * @param {object} input
 * @param {string[]} input.dirs   Workspace の中のフォルダ(相対パス、/ 区切り)。無視する名前は含めなくてよい
 * @param {{path: string, text: string}[]} input.files  .md ファイル(相対パス、/ 区切り)と中身
 * @param {string | null} [input.settingsText]  一番上の _thddun.md の中身
 */
export function buildWorkspace({ dirs, files, settingsText = null }) {
  const warnings = [];
  const ignored = [];
  const settings = parseSettings(settingsText);
  for (const message of settings.warnings) warnings.push({ code: "settings", message, path: SETTINGS_FILE });

  const visible = (path) => path.split("/").every((part) => !isIgnoredName(part) || part === TOPIC_FILE);
  const dirSet = new Set(dirs.filter((d) => d !== "" && visible(d)));

  // ---- Topic を作る
  const topics = [];
  const folderTopicPaths = new Set();
  for (const file of [...files].sort((a, b) => compareCodepoints(a.path, b.path))) {
    if (!file.path.endsWith(".md") || !visible(file.path)) continue;
    const name = basename(file.path);
    const isFolder = name === TOPIC_FILE;
    if (!isFolder && isIgnoredName(name)) continue;

    const topicPath = isFolder ? dirname(file.path) : file.path.slice(0, -".md".length);
    if (topicPath === "") continue; // 一番上の _topic.md は Workspace 自体なので Topic にしない

    const { meta, body } = splitFrontmatter(file.text);
    const id = meta?.id ? String(meta.id) : null;
    if (!id) {
      ignored.push({ path: file.path, reason: meta === null ? "先頭の項目がない" : "id がない" });
      continue;
    }
    if (!isId(id)) {
      warnings.push({ code: "bad-id", message: `id の形が違う: ${id}`, path: file.path });
    }
    if (!isFolder && dirSet.has(topicPath)) {
      warnings.push({
        code: "both-forms",
        message: `${file.path} と ${topicPath}/ の両方がある(${name} を ${topicPath}/${TOPIC_FILE} に移す)`,
        path: file.path,
      });
    }
    if (isFolder) folderTopicPaths.add(topicPath);

    topics.push({
      id,
      title: basename(topicPath),
      path: topicPath,
      file: file.path,
      kind: isFolder ? "folder" : "file",
      parentId: null,
      childIds: [],
      meta,
      requires: [],
      related: [],
      assignees: parseAssignees(meta.assignees, settings),
      body,
    });
  }

  for (const dir of [...dirSet].sort(compareCodepoints)) {
    if (!folderTopicPaths.has(dir)) {
      warnings.push({ code: "no-topic-file", message: `${dir}/ に ${TOPIC_FILE} がない(中の Topic は一つ上の親につなぐ)`, path: dir });
    }
  }

  // ---- ID の重複
  const byId = new Map();
  for (const t of topics) {
    if (byId.has(t.id)) {
      warnings.push({
        code: "duplicate-id",
        message: `ID ${t.id} が重複: ${byId.get(t.id).file} と ${t.file}(後のほうは読まない)`,
        path: t.file,
        id: t.id,
      });
      t.duplicate = true;
    } else {
      byId.set(t.id, t);
    }
  }
  const unique = topics.filter((t) => !t.duplicate);

  // ---- 親子: いちばん近い、上のフォルダ形式の Topic
  const byFolderPath = new Map(unique.filter((t) => t.kind === "folder").map((t) => [t.path, t]));
  const rootIds = [];
  for (const t of unique) {
    let dir = dirname(t.path);
    let parent = null;
    while (dir !== "" && !parent) {
      parent = byFolderPath.get(dir) ?? null;
      dir = dirname(dir);
    }
    if (parent) {
      t.parentId = parent.id;
      parent.childIds.push(t.id);
    } else {
      rootIds.push(t.id);
    }
  }

  // ---- 前提と関連: ID で書く。タイトルが1つに決まれば読むが、警告を出す
  const byTitle = new Map();
  for (const t of unique) byTitle.set(t.title, [...(byTitle.get(t.title) ?? []), t]);
  const resolve = (t, key, ref) => {
    if (isId(ref)) {
      if (byId.has(ref)) return ref;
      warnings.push({ code: "missing-ref", message: `${key} の ${ref} という ID の Topic がない`, path: t.file, id: t.id });
      return null;
    }
    const found = byTitle.get(ref) ?? [];
    if (found.length === 1) {
      warnings.push({ code: "title-ref", message: `${key} の「${ref}」はタイトルで書いてある(ID で書く)`, path: t.file, id: t.id });
      return found[0].id;
    }
    const why = found.length === 0 ? "という Topic がない" : "というタイトルが複数ある";
    warnings.push({ code: "missing-ref", message: `${key} の「${ref}」${why}`, path: t.file, id: t.id });
    return null;
  };
  for (const t of unique) {
    for (const key of ["requires", "related"]) {
      const ids = [];
      for (const ref of asList(t.meta[key])) {
        const id = resolve(t, key, ref.trim());
        if (id === t.id) {
          warnings.push({ code: "self-ref", message: `${key} に自分自身がある`, path: t.file, id: t.id });
        } else if (id && !ids.includes(id)) {
          ids.push(id);
        }
      }
      t[key] = ids;
    }
  }

  // ---- 担当の確認
  for (const t of unique) {
    for (const a of t.assignees) {
      if (!settings.states.includes(a.state)) {
        warnings.push({ code: "unknown-state", message: `${a.name} の状態「${a.state}」が設定の states にない`, path: t.file, id: t.id });
      }
      if (settings.assignees.length > 0 && !settings.assignees.includes(a.name)) {
        warnings.push({ code: "unknown-assignee", message: `担当者「${a.name}」が設定の assignees にない`, path: t.file, id: t.id });
      }
    }
  }

  // ---- 前提の循環(表示は続ける)
  const cycles = findRequireCycles(unique);
  for (const cycle of cycles) {
    const names = cycle.map((id) => byId.get(id).title).join(" → ");
    warnings.push({ code: "cycle", message: `前提が循環している: ${names}`, id: cycle[0] });
  }

  const statuses = computeStatuses(unique, settings);
  const usesAssignees = settings.assignees.length > 0 || unique.some((t) => t.assignees.length > 0);

  return {
    settings: { assignees: settings.assignees, states: settings.states, doneStates: settings.doneStates, found: settings.found },
    usesAssignees,
    topics: unique.map((t) => ({ ...t, status: statuses.get(t.id) })),
    rootIds,
    cycles,
    warnings,
    ignored,
  };
}
