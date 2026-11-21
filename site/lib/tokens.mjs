// @ts-check
/*
 * Design tokens from every file in css/tokens/: each custom property with
 * its value as written, its resolved light and dark values, its group and
 * its description. Zero dependencies; a line-based reader for the plain
 * style those files use (one declaration per line, or continued until ";").
 *
 * Comments:
 *   /* Primitive tokens (internal). … *\/   the file's header comment: title (tier), then the intro
 *   /* 1. Independent tokens: … *\/          a comment before a top-level rule starts a group
 *   /* Space *\/                             a comment inside a rule, after a blank line or "{", starts a group
 *   /* What it is for *\/                    a comment directly after a declaration (no blank line)
 *   --dui-x: 1rem;                           and directly above the next one describes that one
 *   --dui-y: 2rem; /* What it is for *\/     a trailing comment describes its own line
 *
 * Declarations inside an at-rule (@media, @supports, …) or a rule whose
 * selector does not include :root are conditions on the token, not tokens.
 */
import { stripDecoration } from "./css-comments.mjs";

/**
 * @typedef {{ condition: string, value: string, light: string, dark: string }} Condition
 * @typedef {object} Token
 * @property {string} name
 * @property {string} value         as written
 * @property {string} light         resolved for a light color scheme
 * @property {string} dark          resolved for a dark color scheme
 * @property {string} description   from its comment, or ""
 * @property {Condition[]} conditions
 * @property {string} file          repo path
 * @typedef {{ name: string, slug: string, note: string, tokens: Token[] }} TokenGroup
 * @typedef {object} TokenFile
 * @property {string} path          repo path, e.g. "css/tokens/semantic.css"
 * @property {string} slug          file name without .css
 * @property {string} title         "Semantic tokens"
 * @property {string} tier          "public theming API", from the header's parenthesis
 * @property {string} intro         the rest of the header comment, paragraphs joined
 * @property {TokenGroup[]} groups
 * @property {string} sitePath
 */

/** Group name and note from a section comment ("2. Dependent tokens: defined …"). @param {string} comment */
function groupFrom(comment) {
  const text = comment.split(/\n\s*\n/)[0].replace(/\s+/g, " ").replace(/^\d+\.\s*/, "").trim();
  const colon = text.match(/^([^:(]+):\s*([\s\S]*)$/);
  const paren = text.match(/^([^(]+?)\s*\(([^)]*)\)\s*\.?$/);
  const [name, note] = colon ? [colon[1].trim(), colon[2].trim()] : paren ? [paren[1].trim(), paren[2].trim()] : [text.replace(/\.$/, ""), ""];
  return { name, slug: slugifyName(name), note, tokens: /** @type {Token[]} */ ([]) };
}

/** @param {string} name */
const slugifyName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Parse one token file. Values are not resolved yet (see resolveTokens()).
 * @param {string} css
 * @param {string} path repo path
 * @returns {TokenFile}
 */
export function parseTokenFile(css, path) {
  const slug = path.replace(/^.*\//, "").replace(/\.css$/, "");
  const header = css.match(/^\s*\/\*([\s\S]*?)\*\//);
  const headerText = header ? stripDecoration(header[1]) : "";
  const [first = "", ...rest] = headerText.split(/\n\s*\n/);
  const head = first.replace(/\s+/g, " ").trim().match(/^(.*?)\s*(?:\(([^)]*)\))?\.?$/);
  const title = head?.[1] || `${slug.charAt(0).toUpperCase()}${slug.slice(1)} tokens`;
  const tier = head?.[2] ?? "";

  /** @type {TokenGroup[]} */
  const groups = [];
  /** @type {Map<string, Token>} */
  const byName = new Map();
  /** @type {TokenGroup | null} */
  let group = null;
  /** Open blocks: at-rule preludes and selectors. @type {string[]} */
  const stack = [];
  let pending = ""; // a top-level comment, waiting for its rule
  let describe = ""; // a comment directly above the next declaration
  let afterDecl = false; // the previous line was a declaration
  let blank = true; // the previous line was blank or opened a block
  let selector = ""; // the start of a selector list split over lines
  const lines = (header ? css.slice(header.index + header[0].length) : css).split("\n");

  for (let i = 0; i < lines.length; i++) {
    let trimmed = lines[i].trim();
    if (!trimmed) {
      blank = true;
      afterDecl = false;
      describe = "";
      continue;
    }
    if (trimmed.startsWith("/*")) {
      let body = trimmed;
      while (!body.includes("*/") && i + 1 < lines.length) body += `\n${lines[++i]}`;
      const text = stripDecoration(body.replace(/^\/\*/, "").replace(/\*\/[\s\S]*$/, ""));
      if (!stack.length) pending = text;
      else if (blank && !afterDecl && !describe) {
        group = groupFrom(text);
        groups.push(group);
      } else describe = describe ? `${describe} ${text}` : text;
      blank = false;
      continue;
    }
    if (!trimmed.startsWith("--") && trimmed.endsWith(",")) {
      selector += `${trimmed} `;
      continue;
    }
    if (trimmed.endsWith("{")) {
      const prelude = `${selector}${trimmed.slice(0, -1)}`.trim();
      selector = "";
      if (!stack.length && pending && !prelude.startsWith("@")) {
        group = groupFrom(pending);
        groups.push(group);
      }
      pending = "";
      stack.push(prelude);
      blank = true;
      afterDecl = false;
      continue;
    }
    if (trimmed.startsWith("}")) {
      stack.pop();
      blank = false;
      afterDecl = false;
      continue;
    }
    // A declaration, continued over lines until ";".
    while (/^--[\w-]+\s*:/.test(trimmed) && !/;\s*(?:\/\*[\s\S]*\*\/)?$/.test(trimmed) && i + 1 < lines.length) trimmed += ` ${lines[++i].trim()}`;
    const decl = trimmed.match(/^(--[\w-]+)\s*:\s*([\s\S]+?)\s*;\s*(?:\/\*([\s\S]*?)\*\/)?$/);
    if (decl) {
      const [, name, value, trailing] = decl;
      const description = (trailing ? trailing.replace(/\s+/g, " ").trim() : describe).trim();
      const conditional = stack.filter((s) => s.startsWith("@"));
      const rule = stack.filter((s) => !s.startsWith("@")).pop() ?? "";
      const known = byName.get(name);
      if (conditional.length || !/:root\b/.test(rule)) {
        const condition = [...conditional, ...(/:root\b/.test(rule) ? [] : [rule])].join(" ");
        if (known) known.conditions.push({ condition, value, light: "", dark: "" });
      } else if (!known) {
        if (!group) {
          group = groupFrom(title);
          groups.push(group);
        }
        const token = { name, value, light: "", dark: "", description, conditions: [], file: path };
        byName.set(name, token);
        group.tokens.push(token);
      }
      afterDecl = true;
    } else afterDecl = false;
    describe = "";
    blank = false;
  }
  return {
    path,
    slug,
    title,
    tier,
    intro: rest.map((p) => p.replace(/\s*\n\s*/g, " ").trim()).join("\n\n"),
    groups: groups.filter((g) => g.tokens.length),
    sitePath: `tokens/${slug}.html`,
  };
}

/**
 * The index of the bracket that closes the one opening at `open`.
 * @param {string} text
 * @param {number} open index of "("
 */
function closing(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

/** Split function arguments at top-level commas. @param {string} args */
function splitArgs(args) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "(") depth++;
    else if (args[i] === ")") depth--;
    else if (args[i] === "," && depth === 0) {
      out.push(args.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(args.slice(start).trim());
  return out;
}

/**
 * Substitute var() references (recursively, through `values`) and pick
 * one side of light-dark(). Unknown names keep their fallback, or stay as
 * written. A reference cycle stays as written.
 * @param {string} value
 * @param {"light" | "dark"} scheme
 * @param {Map<string, string>} values token name → value as written
 * @param {string[]} [seen]
 * @returns {string}
 */
export function resolveValue(value, scheme, values, seen = []) {
  let out = "";
  let i = 0;
  const re = /\b(var|light-dark)\(/g;
  for (let m = re.exec(value); m; m = re.exec(value)) {
    const open = m.index + m[1].length;
    const end = closing(value, open);
    if (end < 0) break;
    const args = splitArgs(value.slice(open + 1, end));
    let replacement;
    if (m[1] === "light-dark" && args.length === 2) {
      replacement = resolveValue(scheme === "light" ? args[0] : args[1], scheme, values, seen);
    } else if (m[1] === "var") {
      const name = args[0];
      const fallback = value.slice(open + 1, end).slice(value.slice(open + 1, end).indexOf(",") + 1).trim();
      if (values.has(name) && !seen.includes(name)) replacement = resolveValue(/** @type {string} */ (values.get(name)), scheme, values, [...seen, name]);
      else if (args.length > 1) replacement = resolveValue(fallback, scheme, values, seen);
      else replacement = value.slice(m.index, end + 1);
    } else replacement = value.slice(m.index, end + 1);
    out += value.slice(i, m.index) + replacement;
    i = end + 1;
    re.lastIndex = i;
  }
  return out + value.slice(i);
}

/**
 * Resolve every token (and condition) against all files' tokens at once,
 * so semantic tokens resolve through primitives.
 * @param {TokenFile[]} files
 */
export function resolveTokens(files) {
  const tokens = files.flatMap((f) => f.groups.flatMap((g) => g.tokens));
  const values = new Map(tokens.map((t) => [t.name, t.value]));
  for (const t of tokens) {
    t.light = resolveValue(t.value, "light", values, [t.name]);
    t.dark = resolveValue(t.value, "dark", values, [t.name]);
    for (const c of t.conditions) {
      c.light = resolveValue(c.value, "light", values, [t.name]);
      c.dark = resolveValue(c.value, "dark", values, [t.name]);
    }
  }
  return files;
}

/**
 * The kind of preview a token gets, from its name, then its value.
 * @param {Token} t
 * @returns {"color" | "shadow" | "length" | "font-family" | "font-size" | "font-weight" | "line-height" | "letter-spacing" | "radius" | "border-width" | "text"}
 */
export function previewKind(t) {
  const n = t.name;
  const v = t.light;
  if (/-shadow-/.test(n) && !/-color-/.test(n)) return "shadow";
  if (/-color-/.test(n) || /^(?:#[\da-f]{3,8}|(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color|color-mix)\()/i.test(v)) return "color";
  if (/-font-(?:stack-|body$|mono$|heading$)|-font-family/.test(n)) return "font-family";
  if (/-font-weight-/.test(n)) return "font-weight";
  if (/-(?:step-|font-size-)/.test(n)) return "font-size";
  if (/-(?:leading|line-height)-/.test(n)) return "line-height";
  if (/-(?:tracking|letter-spacing)-/.test(n)) return "letter-spacing";
  if (/-radius-/.test(n)) return "radius";
  if (/-(?:border|focus)-(?:width|offset|\d)|-border-width$|-focus-width$|-focus-offset$|-border-\d/.test(n)) return "border-width";
  if (/-(?:space|size)-|-measure$/.test(n) && /^-?[\d.]+(?:rem|em|px|ch|vw|vh|%)?$|^0$/.test(v)) return "length";
  return "text";
}
