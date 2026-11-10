// 本文の Markdown を HTML にする(表示用の小さな変換)。
// 先に全部をエスケープしてから、決まった書き方だけをタグに直すので、本文の HTML はそのまま文字で出る。
// kb の内部リンク [表示](<パス> "ID") は、onTopicLink に渡す #topic/ID のリンクにする。

const ID_IN_TITLE = /^(\d{8}-\d{6}-[a-z0-9]{4})(?: 固定)?$/;

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/** 1行の中の書き方(コード・太字・リンク)。text はエスケープ済み。 */
function inline(text, linkFor) {
  const codes = [];
  let out = text.replace(/(`+)(.+?)\1/g, (_, __, code) => {
    codes.push(`<code>${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  // [表示](&lt;パス&gt; &quot;ID&quot;) — kb のリンク(エスケープ後の形)
  out = out.replace(/\[([^\]]*)\]\(&lt;([^&]*?)&gt;\s+&quot;([^&]*?)&quot;\)/g, (whole, label, path, title) => {
    const m = title.match(ID_IN_TITLE);
    if (m) return `<a href="${linkFor(m[1])}" class="topic-link">${label}</a>`;
    return `<span class="dead-link" title="${path}">${label}</span>`;
  });
  // [表示](https://...) — 外のリンク
  out = out.replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  // [表示](相対パス) — ファイルへのリンクは開けないので、文字だけ
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (_, label, path) => `<span class="dead-link" title="${path}">${label}</span>`);
  // 裸の URL
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function splitRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

/**
 * @param {string} source
 * @param {(id: string) => string} linkFor  Topic の ID から、画面の中のリンク先を作る
 */
export function renderMarkdown(source, linkFor) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) code.push(lines[i++]);
      i++;
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.trimStart().startsWith("<!--")) {
      while (i < lines.length && !lines[i].includes("-->")) i++;
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6); // 画面の h1 は Topic のタイトルなので、1段下げる
      html.push(`<h${level}>${inline(escapeHtml(heading[2]), linkFor)}</h${level}>`);
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(splitRow(lines[i++]));
      const cell = (tag, text) => `<${tag}>${inline(escapeHtml(text), linkFor)}</${tag}>`;
      html.push(
        `<table><thead><tr>${head.map((c) => cell("th", c)).join("")}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => cell("td", c)).join("")}</tr>`).join("")}</tbody></table>`,
      );
      continue;
    }

    const listItem = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
    if (listItem.test(line)) {
      // 入れ子は字下げの深さで作る
      const stack = [];
      while (i < lines.length && (listItem.test(lines[i]) || (lines[i].trim() !== "" && /^\s+/.test(lines[i]) && stack.length > 0))) {
        const m = lines[i].match(listItem);
        if (!m) {
          // 前の項目の続きの行
          html.push(" " + inline(escapeHtml(lines[i].trim()), linkFor));
          i++;
          continue;
        }
        const depth = m[1].replace(/\t/g, "  ").length;
        const tag = /\d/.test(m[2]) ? "ol" : "ul";
        while (stack.length > 0 && depth < stack[stack.length - 1].depth) html.push(`</li></${stack.pop().tag}>`);
        if (stack.length === 0 || depth > stack[stack.length - 1].depth) {
          html.push(`<${tag}><li>`);
          stack.push({ depth, tag });
        } else {
          html.push("</li><li>");
        }
        html.push(inline(escapeHtml(m[3]), linkFor));
        i++;
      }
      while (stack.length > 0) html.push(`</li></${stack.pop().tag}>`);
      continue;
    }

    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      html.push(`<blockquote>${inline(escapeHtml(quote.join(" ")), linkFor)}</blockquote>`);
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !listItem.test(lines[i]) &&
      !lines[i].trimStart().startsWith("```") &&
      !isTableRow(lines[i])
    ) {
      para.push(lines[i++]);
    }
    html.push(`<p>${inline(escapeHtml(para.join("\n")), linkFor).replace(/\n/g, "<br>")}</p>`);
  }
  return html.join("");
}
