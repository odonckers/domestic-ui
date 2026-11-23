// @ts-check
/*
 * Markdown for PRINCIPLES.md, the repository's Markdown files and the
 * handwritten pages under site/content/, parsed by markdown-it
 * (https://github.com/markdown-it/markdown-it): CommonMark
 * (https://spec.commonmark.org/) plus GFM tables
 * (https://github.github.com/gfm/#tables-extension-).
 *
 * On top of markdown-it's defaults:
 * - headings get unique ids, and can be shifted a level up or down;
 * - tables and multi-line code blocks scroll in a named, focusable region
 *   (see markdownToHtml());
 * - links go through options.resolveLink ("site:" links, see ./templates.mjs);
 * - raw HTML is limited to a short allowlist of inline tags such as <kbd>
 *   and <br>; any other tag, and every raw HTML block, is shown as text.
 *
 * tokenize() exposes the block structure (headings, paragraphs, lists,
 * tables, code) with each block's source text, for the build's own
 * extraction (first sentences, tier tables, index tables).
 */
import MarkdownIt from "markdown-it";
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
 * @typedef {import("markdown-it").Token} Token
 */

const INLINE_TAGS = "kbd|br|sub|sup|small|mark|abbr|em|strong|code|samp|var|cite|q|s|del|ins|dfn|time";
const ALLOWED_TAG = new RegExp(`^</?(?:${INLINE_TAGS})(?:\\s+[a-z-]+(?:="[^"<>]*")?)*\\s*/?>$`, "i");

const md = new MarkdownIt({ html: true });

/** The renderer's per-call state: options and the nearest heading above. */
/** @type {{ options: Options, ids: Set<string>, heading: { id: string, text: string }, seen: Map<string, number> }} */
let state = { options: {}, ids: new Set(), heading: { id: "", text: "" }, seen: new Map() };

const rules = md.renderer.rules;

rules.html_inline = (tokens, i) => (ALLOWED_TAG.test(tokens[i].content) ? tokens[i].content : escapeHtml(tokens[i].content));
rules.html_block = (tokens, i) => `<p>${escapeHtml(tokens[i].content.trim())}</p>\n`;

rules.link_open = (tokens, i, opts, env, self) => {
  const token = tokens[i];
  const href = token.attrGet("href");
  const resolve = state.options.resolveLink;
  if (href != null && resolve) token.attrSet("href", resolve(href));
  // Link titles are not used in the docs; keep the markup to href alone.
  if (token.attrGet("title") != null) token.attrs = (token.attrs ?? []).filter(([name]) => name !== "title");
  return self.renderToken(tokens, i, opts);
};

rules.heading_open = (tokens, i) => {
  const inline = tokens[i + 1];
  const level = Math.min(6, Math.max(1, Number(tokens[i].tag.slice(1)) + (state.options.headingShift ?? 0)));
  const text = plainText(inline.content);
  state.heading = { id: uniqueId(text, state.ids), text };
  tokens[i].meta = { level };
  return `<h${level} id="${state.heading.id}">`;
};
rules.heading_close = (tokens, i) => {
  // The opening token of this heading is two back (open, inline, close).
  const level = tokens[i - 2]?.meta?.level ?? Number(tokens[i].tag.slice(1));
  return `</h${level}>\n`;
};

/** Count of blocks of a kind under the current heading. @param {string} kind */
const nth = (kind) => {
  const key = `${kind}\u0000${state.heading.id}\u0000${state.heading.text}`;
  const n = (state.seen.get(key) ?? 0) + 1;
  state.seen.set(key, n);
  return n;
};

/** @param {Token[]} tokens @param {number} i */
const codeBlock = (tokens, i) => {
  const token = tokens[i];
  const lang = token.info ? token.info.trim().split(/\s+/)[0] : "";
  const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
  const code = token.content.replace(/\n$/, "");
  // A one-line block wraps (css/base/typography.css): no line structure to keep, no extra focus stop.
  if (!code.includes("\n")) return `<pre><code${cls}>${escapeHtml(code)}</code></pre>\n`;
  const n = nth("code");
  const name = `Code${state.heading.text ? `: ${state.heading.text}` : ""}${n > 1 ? ` (${n})` : ""}`;
  return `<pre data-scroll="inline" role="region" tabindex="0" aria-label="${escapeHtml(name)}"><code${cls}>${escapeHtml(code)}</code></pre>\n`;
};
rules.fence = codeBlock;
rules.code_block = codeBlock;

rules.table_open = () => {
  const n = nth("table");
  const { id, text } = state.heading;
  const name = n === 1 && id ? `aria-labelledby="${id}"` : `aria-label="${escapeHtml(`${text || "Table"}${n > 1 ? ` (${n})` : ""}`)}"`;
  return `<div data-scroll="inline" role="region" tabindex="0" ${name}>\n<table ${name}>\n`;
};
rules.table_close = () => "</table>\n</div>\n";

// Header cells are column headers; the first cell of each body row is its row header
// (https://www.w3.org/WAI/tutorials/tables/). Alignment is not used in the docs.
rules.tr_open = () => "<tr>";
rules.tr_close = () => "</tr>\n";
rules.th_open = () => '<th scope="col">';
rules.th_close = () => "</th>";
rules.td_open = (tokens, i) => (tokens[i - 1]?.type === "tr_open" ? '<th scope="row">' : "<td>");
rules.td_close = (tokens, i) => {
  // Close the cell with the tag it opened with.
  let j = i - 1;
  while (j >= 0 && tokens[j].type !== "td_open") j--;
  return tokens[j - 1]?.type === "tr_open" ? "</th>" : "</td>";
};

/**
 * Run the renderer with options, restoring the previous state afterwards
 * (inline() is called from inside page rendering).
 * @template T
 * @param {Options} options
 * @param {() => T} fn
 * @returns {T}
 */
function withState(options, fn) {
  const saved = state;
  state = { options, ids: options.ids ?? new Set(), heading: { id: "", text: options.caption ?? "" }, seen: new Map() };
  try {
    return fn();
  } finally {
    state = saved;
  }
}

/**
 * Inline Markdown to HTML.
 * @param {string} text
 * @param {Options} [options]
 */
export function inline(text, options = {}) {
  return withState(options, () => md.renderInline(text));
}

/** Plain text of inline Markdown, for ids, captions and titles. @param {string} text */
export const plainText = (text) => unescapeHtml(withState({}, () => md.renderInline(text)).replace(/<[^>]*>/g, ""));

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
 * @param {string} source
 * @param {Options} [options]
 */
export function markdownToHtml(source, options = {}) {
  return withState(options, () => md.render(source).trimEnd());
}

/* ------------------------------------------------------------------ */
/* Block structure, for extraction                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse Markdown into blocks. Each block keeps its raw source text.
 * @param {string} source
 * @returns {Block[]}
 */
export function tokenize(source) {
  const text = source.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const tokens = md.parse(text, {});
  /** @param {Token} t */
  const rawOf = (t) => (t.map ? lines.slice(t.map[0], t.map[1]).join("\n").replace(/\n+$/, "") : "");
  /** @type {Block[]} */
  const blocks = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.level !== 0) continue;
    if (t.type === "heading_open") {
      blocks.push({ type: "heading", level: Number(t.tag.slice(1)), text: tokens[i + 1].content, raw: rawOf(t) });
    } else if (t.type === "fence" || t.type === "code_block") {
      blocks.push({ type: "code", lang: t.info.trim().split(/\s+/)[0] ?? "", code: t.content.replace(/\n$/, ""), raw: rawOf(t) });
    } else if (t.type === "table_open") {
      /** @type {string[][]} */
      const rows = [];
      for (let j = i + 1; j < tokens.length && tokens[j].type !== "table_close"; j++) {
        if (tokens[j].type === "tr_open") rows.push([]);
        else if (tokens[j].type === "inline") rows[rows.length - 1].push(tokens[j].content.trim());
      }
      blocks.push({ type: "table", rows, raw: rawOf(t) });
    } else if (t.type === "bullet_list_open" || t.type === "ordered_list_open") {
      const { items } = listItems(tokens, i);
      blocks.push({ type: "list", items, raw: rawOf(t) });
    } else if (t.type === "paragraph_open") {
      blocks.push({ type: "paragraph", text: tokens[i + 1].content, raw: rawOf(t) });
    }
  }
  return blocks;
}

/**
 * The items of the list opening at tokens[start], with nested lists as
 * children; an item's text is its paragraphs' inline source.
 * @param {Token[]} tokens
 * @param {number} start
 * @returns {{ items: ListItem[], end: number }}
 */
function listItems(tokens, start) {
  const open = tokens[start];
  const ordered = open.type === "ordered_list_open";
  const first = ordered ? Number(open.attrGet("start") ?? 1) : 1;
  const close = ordered ? "ordered_list_close" : "bullet_list_close";
  /** @type {ListItem[]} */
  const items = [];
  let i = start + 1;
  while (i < tokens.length && !(tokens[i].type === close && tokens[i].level === open.level)) {
    const t = tokens[i];
    if (t.type === "list_item_open") {
      items.push({ ordered, start: first + items.length, text: "", children: [] });
      i++;
    } else if (t.type === "inline" && t.level === open.level + 3) {
      const item = items[items.length - 1];
      item.text = item.text ? `${item.text}\n${t.content}` : t.content;
      i++;
    } else if ((t.type === "bullet_list_open" || t.type === "ordered_list_open") && t.level === open.level + 2) {
      const nested = listItems(tokens, i);
      items[items.length - 1].children.push(...nested.items);
      i = nested.end + 1;
    } else i++;
  }
  return { items, end: i };
}

/**
 * Add `delta` to every ATX heading level, outside fenced code.
 * @param {string} source
 * @param {number} delta
 */
export function shiftHeadings(source, delta) {
  let fence = "";
  return source
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
 * @param {string} source
 * @param {number} level
 * @returns {{ intro: string, sections: { heading: string, body: string }[] }}
 */
export function splitSections(source, level) {
  const marker = new RegExp(`^${"#".repeat(level)}\\s+(.*?)\\s*$`);
  const sections = [];
  const intro = [];
  /** @type {string[]} */
  let current = intro;
  let fence = "";
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
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
