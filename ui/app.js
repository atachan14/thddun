// ローカル版の画面(読み取りだけ)。
// 左: Workspace と Topic の木、真ん中: 子の Topic を Card で並べるボード、右: 選んだ Topic の詳細。
// 場所はアドレスの # に入れる: #/<Workspace の名前>/<Topic の ID>

import { renderMarkdown } from "./markdown.js";

const state = {
  workspaces: [],
  name: null,
  data: null,
  byId: new Map(),
  dependents: new Map(), // ID → その Topic を前提にしている Topic の ID
  relatedFrom: new Map(), // ID → その Topic を関連に書いている Topic の ID
  selectedId: null,
  filter: "",
};

const $ = (id) => document.getElementById(id);

/** 要素を作る。文字は必ず textContent で入れる(本文の HTML をそのまま出さないため)。 */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function hrefFor(id) {
  const name = encodeURIComponent(state.name ?? "");
  return id ? `#/${name}/${encodeURIComponent(id)}` : `#/${name}`;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "X-Thddun-Actor": "me" } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `読み込みに失敗した(${res.status})`);
  return body;
}

// ---------------------------------------------------------------- 読み込み

async function loadWorkspaceList() {
  state.workspaces = (await getJson("/api/workspaces")).workspaces;
}

async function loadWorkspace(name) {
  state.name = name;
  state.data = await getJson(`/api/workspaces/${encodeURIComponent(name)}`);
  state.byId = new Map(state.data.topics.map((t) => [t.id, t]));
  state.dependents = new Map();
  state.relatedFrom = new Map();
  for (const t of state.data.topics) {
    for (const id of t.requires) state.dependents.set(id, [...(state.dependents.get(id) ?? []), t.id]);
    for (const id of t.related) state.relatedFrom.set(id, [...(state.relatedFrom.get(id) ?? []), t.id]);
  }
}

function parseHash() {
  const [, name = "", id = ""] = location.hash.split("/");
  return { name: decodeURIComponent(name), id: decodeURIComponent(id) || null };
}

async function route() {
  try {
    if (state.workspaces.length === 0) await loadWorkspaceList();
    let { name, id } = parseHash();
    if (!name && state.workspaces.length > 0) {
      location.replace(`#/${encodeURIComponent(state.workspaces[0].name)}`);
      return;
    }
    if (name && name !== state.name) await loadWorkspace(name);
    state.selectedId = id && state.byId.has(id) ? id : null;
    render();
  } catch (error) {
    renderError(error);
  }
}

// ---------------------------------------------------------------- 表示

function sortedIds(ids) {
  return [...ids].sort((a, b) => {
    const ta = state.byId.get(a).title;
    const tb = state.byId.get(b).title;
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

function ancestors(id) {
  const chain = [];
  let t = id ? state.byId.get(id) : null;
  while (t) {
    chain.unshift(t);
    t = t.parentId ? state.byId.get(t.parentId) : null;
  }
  return chain;
}

function render() {
  renderWorkspaces();
  renderTree();
  renderBoard();
  renderDetail();
  renderWarnings();
  const here = state.selectedId ? state.byId.get(state.selectedId).title : state.name;
  document.title = here ? `${here} — thddun` : "thddun";
}

function renderWorkspaces() {
  const box = $("workspaces");
  box.replaceChildren();
  if (state.workspaces.length === 0) {
    box.append(
      el("p", { class: "empty-note" }, "Workspace が登録されていない。ターミナルで ", el("code", { text: "npm run workspace -- add kb G:\\kb\\content --readonly" }), " のように登録する。"),
    );
    return;
  }
  for (const w of state.workspaces) {
    box.append(
      el(
        "a",
        { href: `#/${encodeURIComponent(w.name)}`, "aria-current": w.name === state.name ? "true" : null },
        el("span", { text: w.name }),
        w.readonly ? el("span", { class: "ro", text: "読み取り専用" }) : null,
      ),
    );
  }
}

function renderTree() {
  const box = $("tree");
  box.replaceChildren();
  if (!state.data) return;
  const query = state.filter.trim().toLowerCase();
  const matches = (t) => t.title.toLowerCase().includes(query) || t.path.toLowerCase().includes(query);
  // 絞り込み中は、当たった Topic とその祖先だけを出す
  const keep = new Set();
  if (query) {
    for (const t of state.data.topics) {
      if (matches(t)) for (const a of ancestors(t.id)) keep.add(a.id);
    }
  }
  const open = new Set(ancestors(state.selectedId).map((t) => t.id));

  const branch = (ids, depth) => {
    const list = el("ul");
    for (const id of sortedIds(ids)) {
      if (query && !keep.has(id)) continue;
      const t = state.byId.get(id);
      const item = el(
        "li",
        { class: t.childIds.length > 0 ? "folder" : null },
        el("a", { href: hrefFor(id), "aria-current": id === state.selectedId ? "true" : null, title: t.path, text: t.title }),
      );
      // 一番上の段と、選んでいる場所までの段は開いておく
      if (t.childIds.length > 0 && (query || depth === 0 || open.has(id))) item.append(branch(t.childIds, depth + 1));
      list.append(item);
    }
    return list;
  };
  box.append(branch(state.data.rootIds, 0));
}

function statusChips(t) {
  const chips = [];
  if (!state.data.usesAssignees) return chips;
  const s = t.status;
  if (s.kind === "assigned") {
    for (const a of t.assignees) {
      const done = state.data.settings.doneStates.includes(a.state);
      chips.push(el("span", { class: `chip${done ? " done" : ""}`, text: `${a.name}: ${a.state}` }));
    }
    if (s.done) chips.push(el("span", { class: "chip done", text: "完了" }));
  } else if (s.kind === "group") {
    chips.push(el("span", { class: `chip${s.done === s.total ? " done" : ""}`, text: `${s.done}/${s.total} 完了` }));
  }
  if (s.waiting) chips.push(el("span", { class: "chip wait", text: "前提待ち" }));
  return chips;
}

function card(t) {
  const meta = [];
  if (t.meta.priority) meta.push(el("span", { class: `chip prio-${t.meta.priority}`, text: t.meta.priority }));
  meta.push(...statusChips(t));
  if (t.childIds.length > 0) meta.push(el("span", { text: `子 ${t.childIds.length}` }));
  if (t.requires.length > 0) meta.push(el("span", { text: `前提 ${t.requires.length}` }));
  const after = state.dependents.get(t.id)?.length ?? 0;
  if (after > 0) meta.push(el("span", { text: `後続 ${after}` }));
  return el(
    "a",
    { class: "card", href: hrefFor(t.id), "aria-current": t.id === state.selectedId ? "true" : null },
    el("span", { class: "card-title", text: t.title }),
    el("span", { class: "card-meta" }, meta),
  );
}

function renderBoard() {
  const crumbs = $("crumbs");
  const board = $("board");
  crumbs.replaceChildren();
  board.replaceChildren();
  if (!state.data) return;

  // 子があれば子を、なければ兄弟を並べる(選んだ Card は枠で示す)
  const selected = state.selectedId ? state.byId.get(state.selectedId) : null;
  const holder = selected && selected.childIds.length === 0 ? (selected.parentId ? state.byId.get(selected.parentId) : null) : selected;
  const ids = holder ? holder.childIds : state.data.rootIds;

  crumbs.append(el("a", { href: hrefFor(null), text: state.name }));
  for (const t of ancestors(holder?.id)) {
    crumbs.append(el("span", { class: "sep", text: "/" }));
    crumbs.append(el("a", { href: hrefFor(t.id), class: t.id === holder.id ? "here" : null, text: t.title }));
  }

  if (ids.length === 0) board.append(el("p", { class: "board-empty", text: "Topic がない" }));
  for (const id of sortedIds(ids)) board.append(card(state.byId.get(id)));
}

function topicList(ids) {
  if (!ids || ids.length === 0) return null;
  return el("ul", {}, sortedIds(ids).map((id) => el("li", {}, el("a", { href: hrefFor(id), text: state.byId.get(id).title }))));
}

function formatValue(value) {
  if (Array.isArray(value)) return value.length === 0 ? "なし" : value.join(", ");
  return String(value);
}

function renderDetail() {
  const box = $("detail");
  box.replaceChildren();
  const t = state.selectedId ? state.byId.get(state.selectedId) : null;
  if (!t) {
    const count = state.data?.topics.length ?? 0;
    box.append(el("p", { class: "detail-empty", text: state.data ? `${count} 件の Topic。Card か左の一覧から選ぶと、ここに中身が出る。` : "" }));
    return;
  }

  const facts = el("dl", { class: "facts" });
  const fact = (label, value) => {
    if (value === null || value === undefined) return;
    facts.append(el("dt", { text: label }), el("dd", {}, value));
  };
  fact("ID", t.id);
  for (const [key, value] of Object.entries(t.meta)) {
    if (["id", "requires", "related", "assignees"].includes(key) || value === null) continue;
    fact(key, formatValue(value));
  }
  if (t.assignees.length > 0) fact("担当", el("span", { class: "card-meta" }, statusChips(t)));
  else if (state.data.usesAssignees && t.status.kind === "group") fact("進み具合", el("span", { class: "card-meta" }, statusChips(t)));
  fact("前提", topicList(t.requires));
  fact("後続", topicList(state.dependents.get(t.id)));
  fact("関連", topicList([...new Set([...t.related, ...(state.relatedFrom.get(t.id) ?? [])])]));
  fact("子", topicList(t.childIds));

  box.append(
    el("h1", { text: t.title }),
    el("div", { class: "path", text: t.file }),
    facts,
    el("div", { class: "body", html: renderMarkdown(t.body, hrefFor) }),
  );
}

function renderWarnings() {
  const toggle = $("warn-toggle");
  const box = $("warnings");
  const warnings = state.data?.warnings ?? [];
  toggle.hidden = warnings.length === 0;
  toggle.textContent = `警告 ${warnings.length}`;
  box.replaceChildren(
    el(
      "ul",
      {},
      warnings.map((w) => el("li", {}, w.id && state.byId.has(w.id) ? el("a", { href: hrefFor(w.id), text: w.message }) : w.message)),
    ),
  );
  if (warnings.length === 0) box.hidden = true;
}

function renderError(error) {
  $("board").replaceChildren(el("p", { class: "board-empty", text: error.message }));
}

// ---------------------------------------------------------------- 操作

$("warn-toggle").addEventListener("click", () => {
  $("warnings").hidden = !$("warnings").hidden;
});
$("filter").addEventListener("input", (event) => {
  state.filter = event.target.value;
  renderTree();
});
window.addEventListener("hashchange", route);
route();
