// @ts-check
/*
 * A minimal Markdown to HTML converter for PRINCIPLES.md and the
 * handwritten pages under site/content/. It covers the subset those use,
 * following CommonMark (https://spec.commonmark.org/) and GFM tables
 * (https://github.github.com/gfm/#tables-extension-):
 *
 *   ATX headings, paragraphs, nested lists (by indentation), pipe tables,
 *   fenced code blocks, inline code, **bold**, *italics* / _italics_,
 *   [links](url), <https://autolinks>, backslash escapes, and a short
 *   allowlist of inline HTML tags such as <kbd> and <br>.
 *
 * Everything else is escaped. It is not a general Markdown parser: no
 * block quotes, setext headings, reference links or raw HTML blocks.
 */
import { escapeHtml, unescapeHtml, slugify } from "./util.mjs";

/**
 * @typedef {object} Options
 * @property {(href: string) => string} [resolveLink] rewrite link targets
 * @property {Set<string>} [ids] heading ids already used on the page
 * @property {number} [headingShift] added to every heading level
 * @property {string} [caption] name for tables and code with no heading above them (the page's h1)
 *
 * @typedef {{ type: "heading", level: number, text: string, raw: string }
 *   | { type: "code", lang: string, code: string, raw: string }
 *   | { type: "table", rows: string[][], raw: string }
 *   | { type: "list", items: ListItem[], raw: string }
 *   | { type: "paragraph", text: string, raw: string }} Block
 *
 * @typedef {{ ordered: boolean, start: number, text: string, children: ListItem[] }} ListItem
 */

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w-]*)\s*$/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const isTableStart = (lines, i) => lines[i].trim().startsWith("|") && i + 1 < lines.length && TABLE_DELIMITER.test(lines[i + 1]);
const startsBlock = (lines, i) => FENCE.test(lines[i]) || HEADING.test(lines[i]) || isTableStart(lines, i) || LIST_ITEM.test(lines[i]);

/** Split a pipe-table row into raw cells. `\|` is a literal pipe (GFM). @param {string} line */
const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));

/**
 * Parse Markdown into blocks. Each block keeps its raw source text.
 * @param {string} md
 * @returns {Block[]}
 */
export function tokenize(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  /** @type {Block[]} */
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const start = i;
    let m;
    if ((m = line.match(FENCE))) {
      const marker = m[1];
      const body = [];
      i++;
      while (i < lines.length) {
        const close = lines[i].match(/^ {0,3}(`{3,}|~{3,})\s*$/);
        if (close && close[1][0] === marker[0] && close[1].length >= marker.length) break;
        body.push(lines[i++]);
      }
      i++;
      blocks.push({ type: "code", lang: m[2], code: body.join("\n"), raw: lines.slice(start, i).join("\n") });
    } else if ((m = line.match(HEADING))) {
      i++;
      blocks.push({ type: "heading", level: m[1].length, text: m[2], raw: line });
    } else if (isTableStart(lines, i)) {
      const rows = [splitRow(line)];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(splitRow(lines[i++]));
      blocks.push({ type: "table", rows, raw: lines.slice(start, i).join("\n") });
    } else if (LIST_ITEM.test(line)) {
      i++;
      while (i < lines.length) {
        if (lines[i].trim()) {
          // Item, indented continuation, or a lazy continuation line.
          if (LIST_ITEM.test(lines[i]) || /^\s/.test(lines[i]) || !startsBlock(lines, i)) i++;
          else break;
        } else {
          // A blank line ends the list unless an item or indented text follows.
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && (LIST_ITEM.test(lines[j]) || /^\s+\S/.test(lines[j]))) i = j;
          else break;
        }
      }
      const raw = lines.slice(start, i).join("\n").replace(/\n+$/, "");
      blocks.push({ type: "list", items: parseList(raw.split("\n")), raw });
    } else {
      i++;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) i++;
      const raw = lines.slice(start, i).join("\n");
      blocks.push({ type: "paragraph", text: raw.split("\n").map((l) => l.trim()).join("\n"), raw });
    }
  }
  return blocks;
}

/**
 * Build a list tree from its lines. A marker indented past the current
 * item's marker starts a nested list; other lines continue the last item.
 * @param {string[]} lines
 * @returns {ListItem[]}
 */
function parseList(lines) {
  /** @type {ListItem} */
  const root = { ordered: false, start: 1, text: "", children: [] };
  /** @type {{ indent: number, item: ListItem }[]} */
  const stack = [{ indent: -1, item: root }];
  let last = root;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(LIST_ITEM);
    if (m) {
      const indent = m[1].length;
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const ordered = /\d/.test(m[2]);
      last = { ordered, start: ordered ? Number.parseInt(m[2], 10) : 1, text: m[4].trim(), children: [] };
      stack[stack.length - 1].item.children.push(last);
      stack.push({ indent, item: last });
    } else {
      last.text += `\n${line.trim()}`;
    }
  }
  return root.children;
}

const INLINE_TAGS = "kbd|br|sub|sup|small|mark|abbr|em|strong|code|samp|var|cite|q|s|del|ins|dfn|time";
const INLINE_HTML = new RegExp(`</?(?:${INLINE_TAGS})(?:\\s+[a-z-]+(?:="[^"<>]*")?)*\\s*/?>`, "gi");

/**
 * Inline Markdown to HTML. Code spans, escapes, links and allowed tags are
 * set aside first so emphasis never reaches inside them.
 * @param {string} text
 * @param {Options} [options]
 */
export function inline(text, options = {}) {
  const resolve = options.resolveLink ?? ((href) => href);
  /** @type {string[]} */
  const slots = [];
  const hold = (html) => `\u0000${slots.push(html) - 1}\u0000`;

  let s = text.replace(/(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, _ticks, code) => {
    const body = code.replace(/\n/g, " ");
    const trimmed = /^ .*\S.* $/.test(body) ? body.slice(1, -1) : body;
    return hold(`<code>${escapeHtml(trimmed)}</code>`);
  });
  s = s.replace(/\\([!-/:-@[-`{-~])/g, (_, c) => hold(escapeHtml(c)));
  s = s.replace(/<(https?:\/\/[^\s<>]+)>/g, (_, url) => hold(`<a href="${escapeHtml(resolve(url))}">${escapeHtml(url)}</a>`));
  s = s.replace(/\[([^\]]*)\]\(([^()\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href) =>
    hold(`<a href="${escapeHtml(resolve(href))}">${emphasis(label)}</a>`),
  );
  s = s.replace(INLINE_HTML, (tag) => hold(tag));
  s = emphasis(s);
  while (/\u0000\d+\u0000/.test(s)) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => slots[Number(n)]);
  return s;
}

/** Escape, then apply strong and em. @param {string} text */
function emphasis(text) {
  return escapeHtml(text)
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<![\w])__(?=\S)([\s\S]*?\S)__(?![\w])/g, "<strong>$1</strong>")
    .replace(/(?<![*\w])\*(?=[^\s*])([\s\S]*?[^\s*])\*(?![*\w])/g, "<em>$1</em>")
    .replace(/(?<![\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?![\w])/g, "<em>$1</em>");
}

/** Plain text of inline Markdown, for ids, captions and titles. @param {string} text */
export const plainText = (text) => unescapeHtml(inline(text).replace(/<[^>]*>/g, ""));

/**
 * A heading id unique on the page: "theming", then "theming-2", ...
 * @param {string} text
 * @param {Set<string>} ids
 */
export function uniqueId(text, ids) {
  const slug = slugify(text) || "section";
  // Version headings ("0.1.0 - 2026-11-23" in the changelog) would start with a digit; html-validate's
  // valid-id rule wants a letter first, so they read "v010-2026-11-23".
  const base = /^\d/.test(slug) ? `v${slug}` : slug;
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
  ids.add(id);
  return id;
}

/** @param {ListItem[]} items @param {Options} options @returns {string} */
function renderList(items, options) {
  const ordered = items[0]?.ordered;
  const start = ordered && items[0].start !== 1 ? ` start="${items[0].start}"` : "";
  const tag = ordered ? "ol" : "ul";
  const lis = items.map((item) => {
    const nested = item.children.length ? `\n${renderList(item.children, options)}\n` : "";
    return `<li>${inline(item.text, options)}${nested}</li>`;
  });
  return `<${tag}${start}>\n${lis.join("\n")}\n</${tag}>`;
}

/**
 * Render Markdown to HTML.
 * Wide blocks scroll in a named, focusable [data-scroll="inline"] region
 * (css/layout/scroll.css; WCAG 1.4.10 Reflow, 2.1.1 Keyboard):
 * - a table sits in a region; both are labelled by the nearest heading
 *   above them (aria-labelledby), or options.caption at the top of a
 *   page; the visible heading is the caption
 *   (https://www.w3.org/WAI/tutorials/tables/caption-summary/). th scope as
 *   in https://www.w3.org/WAI/tutorials/tables/.
 * - a code block of several lines is its own region, named
 *   "Code: <heading>" (pre[data-scroll~="inline"] keeps its lines); a
 *   one-line block wraps, as css/base/typography.css does by default.
 * A second table or code block under one heading gets "(2)" in its name.
 * @param {string} md
 * @param {Options} [options]
 */
export function markdownToHtml(md, options = {}) {
  const ids = options.ids ?? new Set();
  const shift = options.headingShift ?? 0;
  /** The nearest heading above: its id (none at the top of a page) and text. */
  let heading = { id: "", text: options.caption ?? "" };
  /** @type {Map<string, number>} */
  const seen = new Map();
  /** Count of blocks of a kind under the current heading. @param {string} kind */
  const nth = (kind) => {
    const key = `${kind}\u0000${heading.id}\u0000${heading.text}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n;
  };
  return tokenize(md)
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const level = Math.min(6, Math.max(1, block.level + shift));
          const text = plainText(block.text);
          heading = { id: uniqueId(text, ids), text };
          return `<h${level} id="${heading.id}">${inline(block.text, options)}</h${level}>`;
        }
        case "code": {
          const lang = block.lang ? ` class="language-${escapeHtml(block.lang)}"` : "";
          // A one-line block wraps (css/base/typography.css): no line structure to keep, no extra focus stop.
          if (!block.code.includes("\n")) return `<pre><code${lang}>${escapeHtml(block.code)}</code></pre>`;
          const n = nth("code");
          const name = `Code${heading.text ? `: ${heading.text}` : ""}${n > 1 ? ` (${n})` : ""}`;
          return `<pre data-scroll="inline" role="region" tabindex="0" aria-label="${escapeHtml(name)}"><code${lang}>${escapeHtml(block.code)}</code></pre>`;
        }
        case "table": {
          const [head, ...body] = block.rows;
          const n = nth("table");
          const name = n === 1 && heading.id ? `aria-labelledby="${heading.id}"` : `aria-label="${escapeHtml(`${heading.text || "Table"}${n > 1 ? ` (${n})` : ""}`)}"`;
          const ths = head.map((cell) => `<th scope="col">${inline(cell, options)}</th>`).join("");
          const trs = body.map(
            (row) =>
              `<tr>${row.map((cell, c) => (c === 0 ? `<th scope="row">${inline(cell, options)}</th>` : `<td>${inline(cell, options)}</td>`)).join("")}</tr>`,
          );
          return `<div data-scroll="inline" role="region" tabindex="0" ${name}>\n<table ${name}>\n<thead>\n<tr>${ths}</tr>\n</thead>\n<tbody>\n${trs.join("\n")}\n</tbody>\n</table>\n</div>`;
        }
        case "list":
          return renderList(block.items, options);
        default:
          return `<p>${inline(block.text, options)}</p>`;
      }
    })
    .join("\n");
}

/**
 * Add `delta` to every ATX heading level, outside fenced code.
 * @param {string} md
 * @param {number} delta
 */
export function shiftHeadings(md, delta) {
  let fence = "";
  return md
    .split("\n")
    .map((line) => {
      const f = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (f && (!fence || (f[1][0] === fence[0] && f[1].length >= fence.length && !line.trim().slice(f[1].length)))) {
        fence = fence ? "" : f[1];
        return line;
      }
      if (fence) return line;
      return line.replace(/^(#{1,6})(?=\s)/, (h) => "#".repeat(Math.min(6, Math.max(1, h.length + delta))));
    })
    .join("\n");
}

/**
 * Split Markdown at headings of `level` (outside fenced code).
 * @param {string} md
 * @param {number} level
 * @returns {{ intro: string, sections: { heading: string, body: string }[] }}
 */
export function splitSections(md, level) {
  const marker = new RegExp(`^${"#".repeat(level)}\\s+(.*?)\\s*$`);
  const sections = [];
  const intro = [];
  /** @type {string[]} */
  let current = intro;
  let fence = "";
  for (const line of md.replace(/\r\n?/g, "\n").split("\n")) {
    const f = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (f && (!fence || (f[1][0] === fence[0] && f[1].length >= fence.length))) fence = fence ? "" : f[1];
    const m = !fence && line.match(marker);
    if (m) {
      current = [];
      sections.push({ heading: m[1], lines: current });
    } else current.push(line);
  }
  return {
    intro: intro.join("\n").trim(),
    sections: sections.map((s) => ({ heading: s.heading, body: s.lines.join("\n").trim() })),
  };
}
