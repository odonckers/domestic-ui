// @ts-check
/*
 * Read documentation out of CSS comments. Header comments are the
 * documentation for every file under css/ (see PRINCIPLES.md, "One API
 * per thing"), so the docs site reads them instead of repeating them.
 *
 * Header comment fields the parser understands:
 *
 *   Layout: .stack                  optional one-line label, skipped
 *
 *   Vertical flow with a gap.       first sentence = summary
 *   More prose.                     prose paragraphs = notes
 *
 *   API                             indented block = API
 *     class="stack"
 *
 *   Example                         indented block = markup
 *     <div class="stack">…</div>
 *
 *   https://…                       every URL = a spec link
 */
import { firstSentence } from "./util.mjs";

/**
 * @typedef {object} HeaderDoc
 * @property {string} label       one-line label such as "Layout: .stack", or ""
 * @property {string} summary     first sentence of the first prose paragraph
 * @property {string[]} prose     prose paragraphs, wrapped lines joined
 * @property {string | null} api  dedented API block
 * @property {string[]} apiInline "API: …" one-liners found in any comment
 * @property {string | null} example dedented Example block
 * @property {string[]} urls      every URL, in order, without duplicates
 * @property {string[]} a11y      prose sentences about accessibility
 */

const URL_RE = /https?:\/\/[^\s<>"'`]+/g;
const A11Y_RE = /\b(?:WCAG|ARIA|APG|focus\w*|contrast|accessib\w*|screen reader\w*|forced[- ]colors|reduced motion)\b/i;
const LABEL_RE = /^[A-Z][\w-]*(?: [\w-]+)?: \S.*$/;

/** All comments in a CSS file, with the leading " * " decoration removed. @param {string} css */
export function comments(css) {
  return [...css.matchAll(/\/\*([\s\S]*?)\*\//g)].map((m) => stripDecoration(m[1]));
}

/** @param {string} body */
function stripDecoration(body) {
  const lines = body.split("\n").map((line) => line.replace(/^\s*\* ?/, "").replace(/\s+$/, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join("\n");
}

/** The comment that opens the file, or "". @param {string} css */
export function headerComment(css) {
  const m = css.match(/^\s*\/\*([\s\S]*?)\*\//);
  return m ? stripDecoration(m[1]) : "";
}

/**
 * Remove the common leading whitespace of the non-blank lines. Blank
 * lines lose whatever whitespace they have up to that width.
 * @param {string[]} lines
 */
export function dedent(lines) {
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)?.[0].length ?? 0);
  const width = indents.length ? Math.min(...indents) : 0;
  return { width, text: lines.map((l) => (l.trim() ? l.slice(width) : l.slice(Math.min(width, l.length)))).join("\n") };
}

/** URLs in text, without trailing punctuation, deduplicated. @param {string} text */
export function findUrls(text) {
  const urls = [...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:)]+$/, ""));
  return [...new Set(urls)];
}

/** Sentences of prose, split after . ! or ? followed by a capital letter. @param {string} text */
const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-Z(])/);

/**
 * Parse a header comment into its documented fields.
 * @param {string} text output of headerComment()
 * @param {string[]} [others] the file's other comments, searched for "API:" lines
 * @returns {HeaderDoc}
 */
export function parseHeader(text, others = []) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.split("\n"));
  let label = "";
  if (paragraphs.length > 1 && paragraphs[0].length === 1 && LABEL_RE.test(paragraphs[0][0])) label = paragraphs.shift()?.[0] ?? "";
  else if (paragraphs[0]?.length === 1 && paragraphs.length === 1 && LABEL_RE.test(paragraphs[0][0])) label = paragraphs[0][0];

  /** @type {string | null} */
  let api = null;
  /** @type {string | null} */
  let example = null;
  const prose = [];
  for (const lines of paragraphs) {
    const head = lines[0].trim();
    if (/^API:?$/.test(head)) api = dedent(lines.slice(1)).text;
    else if (/^Examples?:?$/.test(head)) example = dedent(lines.slice(1)).text;
    else if (!/^API:\s/.test(head) && !(label && lines.length === 1 && lines[0] === label)) prose.push(lines.map((l) => l.trim()).join(" "));
  }
  const apiInline = [text, ...others].flatMap((c) => [...c.matchAll(/^\s*API:\s+(.+)$/gm)].map((m) => m[1].trim()));
  const a11y = prose.flatMap(sentences).filter((s) => A11Y_RE.test(s));
  return {
    label,
    summary: prose.length ? firstSentence(prose[0]) : label.replace(/^[^:]+:\s*/, ""),
    prose,
    api,
    apiInline,
    example,
    urls: findUrls(text),
    a11y,
  };
}

/**
 * Name a spec link by its host, as the docs list them.
 * @param {string} url
 * @returns {"MDN" | "WHATWG" | "WCAG" | "APG" | "W3C" | "Other"}
 */
export function specLabel(url) {
  const { hostname, pathname } = new URL(url);
  if (hostname === "developer.mozilla.org") return "MDN";
  if (hostname === "whatwg.org" || hostname.endsWith(".whatwg.org")) return "WHATWG";
  if (hostname === "www.w3.org" && pathname.startsWith("/WAI/ARIA/apg")) return "APG";
  if (hostname === "www.w3.org" && /\/WCAG2\d|\/Understanding\//.test(pathname)) return "WCAG";
  if (hostname === "www.w3.org" || hostname === "w3.org" || hostname.endsWith(".csswg.org") || hostname === "w3c.github.io") return "W3C";
  return "Other";
}

/** The declared layer order in css/domestic.css. @param {string} css */
export function parseLayerOrder(css) {
  const m = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/@layer\s+([^;{]+);/);
  return m ? m[1].split(",").map((s) => s.trim()) : [];
}

/**
 * @typedef {{ name: string, value: string, conditions: { media: string, value: string }[] }} Token
 * @typedef {{ name: string, slug: string, note: string, tokens: Token[] }} TokenGroup
 */

/**
 * Token groups of css/tokens/semantic.css, from its section comments.
 * A one-line comment inside a rule (such as "Space") starts a group; a
 * block comment before a top-level rule (such as "2. Dependent tokens: …")
 * starts one too. A declaration inside @media is recorded as a condition
 * on the token it overrides instead of a new token. Empty groups are dropped.
 * @param {string} css
 * @returns {TokenGroup[]}
 */
export function parseTokenGroups(css) {
  /** @type {TokenGroup[]} */
  const groups = [];
  /** @type {Map<string, Token>} */
  const byName = new Map();
  /** @type {TokenGroup | null} */
  let group = null;
  let depth = 0;
  let media = "";
  let pending = "";
  const lines = css.split("\n");

  const startGroup = (comment) => {
    const text = comment.replace(/\s+/g, " ").replace(/^\d+\.\s*/, "").trim();
    let name = text;
    let note = "";
    const colon = text.match(/^([^:(]+):\s*([\s\S]*)$/);
    const paren = text.match(/^([^(]+?)\s*\(([^)]*)\)\s*$/);
    if (colon) [name, note] = [colon[1].trim(), colon[2].trim()];
    else if (paren) [name, note] = [paren[1].trim(), paren[2].trim()];
    group = { name, slug: slugifyName(name), note, tokens: [] };
    groups.push(group);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("/*")) {
      let body = trimmed;
      while (!body.includes("*/") && i + 1 < lines.length) body += `\n${lines[++i]}`;
      const text = stripDecoration(body.replace(/^\/\*/, "").replace(/\*\/[\s\S]*$/, ""));
      if (depth > 0 && !media) startGroup(text);
      else if (depth === 0) pending = text;
      continue;
    }
    const at = trimmed.match(/^@media\s+([^{]+?)\s*\{$/);
    if (at) {
      media = at[1];
      depth++;
      pending = "";
      continue;
    }
    if (trimmed.endsWith("{")) {
      if (depth === 0 && pending) startGroup(pending);
      pending = "";
      depth++;
      continue;
    }
    const decl = trimmed.match(/^(--dui-[\w-]+)\s*:\s*(.+?);$/);
    if (decl) {
      const [, name, value] = decl;
      const known = byName.get(name);
      if (media && known) known.conditions.push({ media, value });
      else if (!known) {
        if (!group) startGroup("Other");
        const token = { name, value, conditions: [] };
        byName.set(name, token);
        /** @type {TokenGroup} */ (/** @type {unknown} */ (group)).tokens.push(token);
      }
    }
    if (trimmed.startsWith("}")) {
      depth = Math.max(0, depth - 1);
      if (depth === 0) media = "";
    }
  }
  return groups.filter((g) => g.tokens.length);
}

/** @param {string} name */
const slugifyName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
