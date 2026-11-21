// @ts-check
/*
 * The API block and labelled blocks (States, Sizes, Motion, …) of a CSS
 * header comment, as Markdown: tables and prose instead of the
 * space-aligned text of the comment. See site/README.md, "Header comment
 * fields".
 *
 * An API block is rows of "attribute or value", two or more spaces, then
 * what it does:
 *
 *   data-dialog="drawer [start | end]"  a drawer at the inline-start or inline-end
 *                                       edge (end is the default)
 *
 * A line indented to the second column, or starting in lower case right
 * under a row, continues that row. A line with no second column is an
 * attribute alone when it reads as code (data-…, <tag>, --property, …),
 * else prose ("Children, in source order:"), shown as a paragraph
 * between the tables. "on <element>" at the start of the second column
 * becomes the Where column.
 */

/** A row start: something, two or more spaces, something. */
const ROW_RE = /^(\S.*?)\s{2,}(\S.*)$/;
/** A line that reads as code: an attribute, a tag, a custom property or a method. */
const CODE_LINE_RE = /^(?:<|--|\[|[a-z][\w-]*=|data-|aria-|role\b|class\b|element\.|[a-z]+-[a-z-]+\s)/;

/**
 * Inline code in comment prose, as Markdown code spans: tags, attributes
 * with their values, custom properties, attribute selectors. Everything
 * else goes through `prose` (escaping).
 */
const CODE_RE =
  /(var\([^()]*\)|(?:css|web-components|explainers|examples|demos)\/[\w./-]*\w|\b[\w-]+\.(?:css|js|md)\b|<\/?[a-z][\w-]*(?:\s[^<>]*)?>|--[a-z][\w-]*(?:\([^)]*\))?|\b(?:data|aria)-[a-z][\w-]*(?:="[^"]*")?|\b(?:role|class|type|popover|popovertarget|closedby|name|activation|tabindex|rel|href|list|value|label|hidden|open)="[^"]*"|\[[a-z][\w-]*\]|:focus-visible|:root\b|@starting-style|\b[a-z][a-z-]*\(\)|element\.[a-zA-Z]+\([^)]*\))/;

/**
 * Comment prose to Markdown with code spans.
 * @param {string} text
 * @param {(text: string) => string} prose escapes plain text (commentMd)
 */
export const codeMd = (text, prose) =>
  text
    .split(CODE_RE)
    .map((part, i) => (i % 2 ? `\`${part}\`` : prose(part)))
    .join("");

/** Join wrapped comment lines; a line ending in "-" was cut inside a word or name. @param {string[]} lines */
const joinLines = (lines) => lines.reduce((out, l) => (!out ? l : out.endsWith("-") ? out + l : `${out} ${l}`), "");

/**
 * @typedef {{ type: "row", attr: string, text: string[], col: number, indent: number }} Row
 * @typedef {{ type: "prose", text: string[] }} Prose
 */

/**
 * Parse an API block (dedented) into rows and prose, in order.
 * @param {string} text
 * @returns {(Row | Prose)[]}
 */
export function parseApi(text) {
  /** @type {(Row | Prose)[]} */
  const out = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    const indent = raw.match(/^\s*/)?.[0].length ?? 0;
    const line = raw.trim();
    const last = out.at(-1);
    const m = line.match(ROW_RE);
    // Indented to (or near) the previous row's second column, or under a row without one: continues it.
    if (last?.type === "row" && ((last.col > 0 && indent >= last.col - 1) || (indent > last.indent && !m))) {
      last.text.push(line);
      continue;
    }
    if (last?.type === "row" && indent === 0 && !m && /^[a-z(]/.test(line) && !CODE_LINE_RE.test(line)) {
      last.text.push(line);
      continue;
    }
    if (last?.type === "prose" && !/[.:]$/.test(last.text.at(-1) ?? "")) {
      last.text.push(line);
      continue;
    }
    if (m) {
      out.push({ type: "row", attr: m[1].trim(), text: [m[2].trim()], col: indent + raw.trim().indexOf(m[2]), indent });
    } else if (CODE_LINE_RE.test(line)) {
      // An attribute alone; "(…)" after it is its note.
      const note = line.match(/^(.*?\S)\s+\((.*)\)$/);
      out.push({ type: "row", attr: note ? note[1] : line, text: note ? [note[2]] : [], col: 0, indent });
    } else out.push({ type: "prose", text: [line] });
  }
  return out;
}

/** "on the <table>: header surface…" → Where "the <table>", Effect "header surface…". @param {string} text */
function splitWhere(text) {
  if (!/^on\s/.test(text)) return { where: "", effect: text };
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ("([<".includes(c)) depth++;
    else if (")]>".includes(c)) depth--;
    else if (depth === 0 && (c === ":" || c === ";") && /\s/.test(text[i + 1] ?? " ")) return { where: text.slice(3, i).trim(), effect: text.slice(i + 1).trim() };
  }
  return { where: text.slice(3).trim(), effect: "" };
}

/** Escape a Markdown table cell. @param {string} text */
const cell = (text) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

/**
 * Rows to a Markdown table: Attribute or value | Where | Effect (Where
 * only when a row has one).
 * @param {Row[]} rows
 * @param {(text: string) => string} prose
 */
function tableMd(rows, prose) {
  const parsed = rows.map((r) => ({ attr: r.attr, ...splitWhere(joinLines(r.text).replace(/\s+/g, " ")) }));
  const where = parsed.some((r) => r.where);
  const head = where ? ["Attribute or value", "Where", "Effect"] : ["Attribute or value", "Effect"];
  const lines = parsed.map((r) => {
    const cells = [`\`${r.attr.replace(/`/g, "")}\``, ...(where ? [codeMd(r.where, prose)] : []), codeMd(r.effect, prose)];
    return `| ${cells.map(cell).join(" | ")} |`;
  });
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...lines].join("\n");
}

/** Sentence case, unless the text opens with code ("data-alert=…"). @param {string} text */
const capital = (text) => (text.search(CODE_RE) === 0 || /^[a-z][\w-]*[=(]/.test(text) ? text : text.charAt(0).toUpperCase() + text.slice(1));

/**
 * An API block as Markdown: tables of rows, prose paragraphs between them.
 * @param {string} text
 * @param {(text: string) => string} prose
 */
export function apiMd(text, prose) {
  /** @type {string[]} */
  const parts = [];
  /** @type {Row[]} */
  let rows = [];
  const flush = () => {
    if (rows.length) parts.push(tableMd(rows, prose));
    rows = [];
  };
  for (const item of parseApi(text)) {
    if (item.type === "row") rows.push(item);
    else {
      flush();
      parts.push(codeMd(capital(joinLines(item.text)), prose));
    }
  }
  flush();
  return parts.join("\n\n");
}

/**
 * A labelled block (States, Sizes, Motion, …) as Markdown: a table when it
 * is written as rows (button States), else prose, with "- " lines as a list.
 * @param {string} text the block without its label
 * @param {(text: string) => string} prose escapes plain text; URLs are dropped first by the caller
 */
export function labelledMd(text, prose) {
  if (ROW_RE.test(text.split("\n")[0].trim())) return apiMd(text, prose);
  /** @type {{ list: boolean, lines: string[] }[]} */
  const parts = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith("- ")) parts.push({ list: true, lines: [line.slice(2)] });
    else if (parts.length && (!parts.at(-1)?.list || !/[.;]$/.test(parts.at(-1)?.lines.at(-1) ?? ""))) parts.at(-1)?.lines.push(line);
    else parts.push({ list: false, lines: [line] });
  }
  const out = [];
  for (const [i, p] of parts.entries()) {
    const md = codeMd(capital(joinLines(p.lines)), prose);
    out.push(p.list ? `${parts[i - 1]?.list ? "" : "\n"}- ${md}` : `${i ? "\n" : ""}${md}`);
  }
  return out.join("\n").trim();
}
