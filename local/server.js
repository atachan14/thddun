// ローカル版のサーバー。このパソコンの中(127.0.0.1)からだけ開ける。
// 画面(ui/)を配り、Workspace のフォルダを読んでコアで組み立てた結果を返す。
//   npm start          → http://127.0.0.1:4310/
//   THDDUN_PORT=5000 npm start

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkspace, checkPermission, READ } from "../core/index.js";
import { readWorkspaceFolder } from "./fs-source.js";
import { loadWorkspaces } from "./registry.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const STATIC_DIRS = {
  "/core/": join(ROOT, "core"),
  "/": join(ROOT, "ui"),
};
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { ...HEADERS, "Content-Type": type });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

/** ほかのサイトからの読み取り(DNS の付け替えなど)を防ぐため、宛先が自分のときだけ答える。 */
function isLocalHost(host, port) {
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
}

/** 操作する人。画面からは X-Thddun-Actor で渡す。なければ自分(me)。 */
function actorFrom(req) {
  const name = String(req.headers["x-thddun-actor"] ?? "me").trim();
  return { name: name || "me" };
}

async function serveStatic(res, pathname) {
  for (const [prefix, dir] of Object.entries(STATIC_DIRS)) {
    if (!pathname.startsWith(prefix)) continue;
    const relative = pathname.slice(prefix.length) || "index.html";
    const file = normalize(join(dir, decodeURIComponent(relative)));
    if (!file.startsWith(dir + sep)) return send(res, 404, { error: "見つからない" });
    try {
      const body = await readFile(file);
      return send(res, 200, body, TYPES[extname(file)] ?? "application/octet-stream");
    } catch {
      return send(res, 404, { error: "見つからない" });
    }
  }
  return send(res, 404, { error: "見つからない" });
}

export function createThddunServer() {
  const server = createServer(async (req, res) => {
    try {
      if (!isLocalHost(req.headers.host, server.address().port)) return send(res, 403, { error: "このパソコンの中からだけ開ける" });
      if (req.method !== "GET") return send(res, 405, { error: "今は読み取りだけ" });

      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      if (pathname === "/api/workspaces") {
        const workspaces = await loadWorkspaces();
        return send(res, 200, { workspaces: workspaces.map(({ name, readonly }) => ({ name, readonly })) });
      }

      const match = pathname.match(/^\/api\/workspaces\/([^/]+)$/);
      if (match) {
        const name = decodeURIComponent(match[1]);
        const workspace = (await loadWorkspaces()).find((w) => w.name === name);
        if (!workspace) return send(res, 404, { error: `${name} という Workspace はない` });
        const permission = checkPermission(actorFrom(req), READ, workspace);
        if (!permission.allowed) return send(res, 403, { error: permission.reason });
        const built = buildWorkspace(await readWorkspaceFolder(workspace.path));
        return send(res, 200, { name: workspace.name, readonly: workspace.readonly, ...built });
      }

      if (pathname.startsWith("/api/")) return send(res, 404, { error: "見つからない" });
      return serveStatic(res, pathname);
    } catch (error) {
      console.error(error);
      return send(res, 500, { error: error.message });
    }
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const port = Number(process.env.THDDUN_PORT ?? 4310);
  createThddunServer().listen(port, "127.0.0.1", () => {
    console.log(`thddun: http://127.0.0.1:${port}/`);
  });
}
