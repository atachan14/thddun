import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, splitFrontmatter, buildWorkspace, wouldCreateCycle, newId, isId } from "../core/index.js";

const A = "20261110-100000-aaaa";
const B = "20261110-100000-bbbb";
const C = "20261110-100000-cccc";
const D = "20261110-100000-dddd";

function topic(id, extra = "") {
  return `---\nid: "${id}"\n${extra}---\n本文 ${id}\n`;
}

test("先頭の項目を kb と同じ範囲で読む", () => {
  const meta = parseFrontmatter(
    [
      'id: "20261106-090134-zlph"',
      "priority: decided  # コメント",
      "requires: []",
      "related:",
      '  - "20261029-193210-e0xo"  # プロジェクトdocsとkbの分担',
      "  - plain",
      "tags: [a, 'b c']",
      "note: '# は引用符の中なら残る'",
    ].join("\n"),
  );
  assert.deepEqual(meta, {
    id: "20261106-090134-zlph",
    priority: "decided",
    requires: [],
    related: ["20261029-193210-e0xo", "plain"],
    tags: ["a", "b c"],
    note: "# は引用符の中なら残る",
  });
});

test("先頭の項目がないファイルは meta が null", () => {
  assert.deepEqual(splitFrontmatter("# 見出し\n本文"), { meta: null, body: "# 見出し\n本文" });
  assert.equal(splitFrontmatter("﻿---\nid: x\n---\nbody").body, "body");
});

test("親子はフォルダの入れ子で、_ で始まるものと id のないものは読まない", () => {
  const ws = buildWorkspace({
    dirs: ["dev", "dev/sub", "plain"],
    files: [
      { path: "dev/_topic.md", text: topic(A) },
      { path: "dev/one.md", text: topic(B) },
      { path: "dev/sub/two.md", text: topic(C) }, // dev/sub に _topic.md がないので dev につなぐ
      { path: "plain/three.md", text: topic(D) },
      { path: "dev/_memo.md", text: topic("20261110-100000-zzzz") },
      { path: "_private/secret.md", text: topic("20261110-100000-yyyy") },
      { path: "noid.md", text: "---\npriority: idea\n---\n" },
    ],
  });
  const byTitle = Object.fromEntries(ws.topics.map((t) => [t.title, t]));
  assert.deepEqual(Object.keys(byTitle).sort(), ["dev", "one", "three", "two"]);
  assert.equal(byTitle.one.parentId, A);
  assert.equal(byTitle.two.parentId, A);
  assert.equal(byTitle.three.parentId, null);
  assert.deepEqual(ws.rootIds.sort(), [A, D].sort());
  assert.deepEqual(ws.ignored, [{ path: "noid.md", reason: "id がない" }]);
  assert.ok(ws.warnings.some((w) => w.code === "no-topic-file" && w.path === "dev/sub"));
  assert.ok(ws.warnings.some((w) => w.code === "no-topic-file" && w.path === "plain"));
});

test("前提は ID で解決し、見つからないものとタイトルで書いたものは警告する", () => {
  const ws = buildWorkspace({
    dirs: [],
    files: [
      { path: "a.md", text: topic(A, `requires:\n  - "${B}"\n  - c\n  - "20261110-100000-none"\n`) },
      { path: "b.md", text: topic(B) },
      { path: "c.md", text: topic(C) },
    ],
  });
  const a = ws.topics.find((t) => t.id === A);
  assert.deepEqual(a.requires, [B, C]);
  assert.deepEqual(
    ws.warnings.map((w) => w.code).sort(),
    ["missing-ref", "title-ref"],
  );
});

test("ID の重複は後のほうを読まない", () => {
  const ws = buildWorkspace({
    dirs: [],
    files: [
      { path: "a.md", text: topic(A) },
      { path: "copy.md", text: topic(A) },
    ],
  });
  assert.equal(ws.topics.length, 1);
  assert.equal(ws.topics[0].title, "a");
  assert.ok(ws.warnings.some((w) => w.code === "duplicate-id"));
});

test("前提の循環は警告して、表示は続ける", () => {
  const ws = buildWorkspace({
    dirs: [],
    files: [
      { path: "a.md", text: topic(A, `requires: ["${B}"]\n`) },
      { path: "b.md", text: topic(B, `requires: ["${C}"]\n`) },
      { path: "c.md", text: topic(C, `requires: ["${A}"]\n`) },
      { path: "d.md", text: topic(D, `requires: ["${A}"]\n`) },
    ],
  });
  assert.equal(ws.cycles.length, 1);
  assert.deepEqual([...ws.cycles[0]].sort(), [A, B, C].sort());
  assert.equal(ws.topics.length, 4);
  assert.ok(ws.warnings.some((w) => w.code === "cycle"));
});

test("前提を足すと循環になるかを確かめる", () => {
  const topics = [
    { id: A, requires: [B] },
    { id: B, requires: [C] },
    { id: C, requires: [] },
  ];
  assert.equal(wouldCreateCycle(topics, C, A), true);
  assert.equal(wouldCreateCycle(topics, A, C), false);
  assert.equal(wouldCreateCycle(topics, A, A), true);
});

test("完了: 担当者が全員完了で、担当のある子も全部完了", () => {
  const settings = "---\nassignees: [me, ai]\nstates: [未着手, 進行中, 保留, 完了]\ndone: [完了]\n---\n";
  const ws = buildWorkspace({
    settingsText: settings,
    dirs: ["parent", "group"],
    files: [
      { path: "parent/_topic.md", text: topic(A, "assignees:\n  - me: 完了\n") },
      { path: "parent/child.md", text: topic(B, "assignees:\n  - ai: 進行中\n") },
      { path: "parent/note.md", text: topic(C) }, // 担当のない子は数えない
      { path: "group/_topic.md", text: topic(D) },
      { path: "group/x.md", text: topic("20261110-100000-xxxx", "assignees:\n  - me: 完了\n") },
      { path: "group/y.md", text: topic("20261110-100000-yyyy", `assignees:\n  - me\nrequires: ["${A}"]\n`) },
    ],
  });
  const s = Object.fromEntries(ws.topics.map((t) => [t.title, t.status]));
  assert.equal(ws.usesAssignees, true);
  assert.equal(s.parent.kind, "assigned");
  assert.equal(s.parent.done, false); // 子の child が進行中
  assert.equal(s.child.done, false);
  assert.equal(s.note.kind, "none");
  assert.deepEqual([s.group.kind, s.group.done, s.group.total], ["group", 1, 2]);
  assert.equal(s.y.done, false); // 状態を書かなければ最初の状態(未着手)
  assert.equal(s.y.waiting, true); // 前提の parent が未完了
  assert.deepEqual(s.y.waitingFor, [A]);
  assert.equal(s.x.waiting, false);
});

test("設定にない状態と担当者は警告する", () => {
  const ws = buildWorkspace({
    settingsText: "---\nassignees: [me]\n---\n",
    dirs: [],
    files: [{ path: "a.md", text: topic(A, "assignees:\n  - you: 途中\n") }],
  });
  assert.deepEqual(ws.warnings.map((w) => w.code).sort(), ["unknown-assignee", "unknown-state"]);
});

test("ID は kb と同じ形で、日時は日本時間", () => {
  const id = newId(new Date("2026-11-10T01:02:03Z"), () => 0);
  assert.equal(id, "20261110-100203-aaaa");
  assert.ok(isId(id));
});
