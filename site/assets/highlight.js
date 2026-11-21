/*
 * Syntax highlighting for docs code blocks with the CSS Custom Highlight API:
 * https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API
 * A small tokenizer for HTML (with inline <style> and <script>), CSS and
 * JavaScript finds token offsets in each `pre > code`, turns them into Ranges
 * over the existing text nodes and registers them as CSS.highlights named
 * dui-code-<name>. The colors are the ::highlight(dui-code-*) rules in
 * css/base/typography.css; names: explainers/code-highlighting.md.
 * No markup is added, so copied code stays clean. Without JavaScript or the
 * API the code is plain text. Not a full parser: good enough for the docs.
 * No network requests.
 */

/** @typedef {[name: string, start: number, end: number]} Token */

const JS_KEYWORDS = new Set(
  ("async await break case catch class const continue default delete do else export extends false finally for from " +
    "function if import in instanceof let new null of return static super switch this throw true try typeof undefined " +
    "var void while yield").split(" "),
);

/**
 * Runs a sticky regex at `i`; returns the match or null.
 * @param {RegExp} re a regex with the y flag
 * @param {string} text
 * @param {number} i
 */
function at(re, text, i) {
  re.lastIndex = i;
  return re.exec(text);
}

const JS_RULES = /** @type {[RegExp, string][]} */ ([
  [/\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y, "comment"],
  [/(["'])(?:\\[\s\S]|(?!\1)[^\\\n])*\1?|`(?:\\[\s\S]|[^\\`])*`?/y, "string"],
  [/(?:0[xob][\da-f_]+|(?:\d[\d_]*\.?\d*|\.\d+)(?:e[+-]?\d+)?)n?(?![\w$])/iy, "number"],
  [/(?<=\.\s*)[A-Za-z_$][\w$]*|(?<=[{,]\s*)[A-Za-z_$][\w$]*(?=\s*:)/y, "property"],
  [/[A-Za-z_$][\w$]*/y, "word"],
  [/=>|[=!<>]=+/y, "operator"],
  [/[{}()[\];:,=]/y, "punctuation"],
]);

/**
 * JavaScript: comments, strings, numbers, keywords, properties (after a dot,
 * or `key:` in an object), punctuation. Identifiers and operators stay plain.
 * @param {string} text
 * @param {number} from
 * @param {number} to
 * @param {Token[]} out
 */
function tokenizeJs(text, from, to, out) {
  const src = text.slice(0, to);
  let i = from;
  scan: while (i < to) {
    for (const [re, name] of JS_RULES) {
      const m = at(re, src, i);
      if (!m) continue;
      const end = i + m[0].length;
      if (name === "word") {
        if (JS_KEYWORDS.has(m[0])) out.push(["keyword", i, end]);
      } else if (name !== "operator") out.push([name, i, end]);
      i = end;
      continue scan;
    }
    i++;
  }
}

/**
 * CSS values and selectors share these: comments, strings, numbers with units
 * and hex colors, punctuation. Anything else is `rest` (tag in a selector,
 * plain in a value).
 * @param {string} text
 * @param {number} from
 * @param {number} to
 * @param {Token[]} out
 * @param {string | null} rest
 */
function tokenizeCssPart(text, from, to, out, rest) {
  const src = text.slice(0, to);
  const selector = rest !== null;
  const rules = /** @type {[RegExp, string | null][]} */ ([
    [/\/\*[\s\S]*?(?:\*\/|$)/y, "comment"],
    [/(["'])(?:\\[\s\S]|(?!\1)[^\\\n])*\1?/y, "string"],
    ...(selector ? [] : [[/(?<![\w-])(?:#[\da-f]{3,8}|-?(?:\d*\.)?\d+(?:[a-z]+|%)?)(?![\w-])/iy, "number"]]),
    [selector ? /,/y : /[(),:;]/y, "punctuation"],
    [selector ? /[^\s"',]+/y : /[^\s"'/,(){};:]+|\S/y, rest],
  ]);
  let i = from;
  scan: while (i < to) {
    for (const [re, name] of rules) {
      const m = at(re, src, i);
      if (!m || !m[0]) continue;
      if (name) out.push([name, i, i + m[0].length]);
      i += m[0].length;
      continue scan;
    }
    i++;
  }
}

/**
 * CSS: at each statement start, a prelude ending in `{` is a selector (tag)
 * or an at-rule (keyword, then value tokens); otherwise `name:` is a property
 * and the rest up to `;` or `}` is a value. Handles nesting.
 * @param {string} text
 * @param {number} from
 * @param {number} to
 * @param {Token[]} out
 */
function tokenizeCss(text, from, to, out) {
  let i = from;
  while (i < to) {
    const space = at(/\s+/y, text, i);
    if (space) i += space[0].length;
    if (i >= to) break;
    const comment = at(/\/\*[\s\S]*?(?:\*\/|$)/y, text, i);
    if (comment) {
      out.push(["comment", i, Math.min(to, i + comment[0].length)]);
      i += comment[0].length;
      continue;
    }
    if (text[i] === "{" || text[i] === "}" || text[i] === ";") {
      out.push(["punctuation", i, ++i]);
      continue;
    }
    // The statement runs to the next { ; or } outside strings and comments.
    const stmt = at(/(?:\/\*[\s\S]*?(?:\*\/|$)|(["'])(?:\\[\s\S]|(?!\1)[^\\])*\1?|[^{};"'/]|\/)*/y, text, i);
    const end = Math.min(to, i + (stmt ? stmt[0].length : 1));
    const atRule = at(/@[\w-]+/y, text, i);
    const decl = at(/(--[\w-]+|-?[a-z][\w-]*)\s*:(?!:)/iy, text, i);
    if (atRule) {
      out.push(["keyword", i, i + atRule[0].length]);
      tokenizeCssPart(text, i + atRule[0].length, end, out, null);
    } else if (decl && text[end] !== "{") {
      out.push(["property", i, i + decl[1].length]);
      tokenizeCssPart(text, i + decl[1].length, end, out, null);
    } else {
      tokenizeCssPart(text, i, end, out, "tag");
    }
    i = Math.max(end, i + 1);
  }
}

/**
 * HTML: comments, tags, attribute names and values, and the contents of
 * <style> and <script> as CSS and JavaScript. Text content stays plain.
 * @param {string} text
 * @param {number} from
 * @param {number} to
 * @param {Token[]} out
 */
function tokenizeHtml(text, from, to, out) {
  let i = from;
  while (i < to) {
    const lt = text.indexOf("<", i);
    if (lt < 0 || lt >= to) break;
    i = lt;
    const comment = at(/<!--[\s\S]*?(?:-->|$)/y, text, i);
    if (comment) {
      out.push(["comment", i, (i += comment[0].length)]);
      continue;
    }
    const open = at(/(<\/?|<!)([A-Za-z][\w-]*)/y, text, i);
    if (!open) {
      i++;
      continue;
    }
    out.push(["punctuation", i, i + open[1].length], ["tag", i + open[1].length, (i += open[0].length)]);
    const name = open[2].toLowerCase();
    let type = "";
    for (;;) {
      const attr = at(/(\s*)([^\s"'<>/=]+)(?:(\s*=\s*)("[^"]*"?|'[^']*'?|[^\s"'<>=`]+))?/y, text, i);
      if (!attr) break;
      const nameAt = i + attr[1].length;
      out.push(["attribute", nameAt, nameAt + attr[2].length]);
      if (attr[3]) {
        const eq = nameAt + attr[2].length + attr[3].indexOf("=");
        const valueAt = nameAt + attr[2].length + attr[3].length;
        out.push(["punctuation", eq, eq + 1], ["string", valueAt, valueAt + attr[4].length]);
        if (attr[2].toLowerCase() === "type") type = attr[4].replace(/["']/g, "").toLowerCase();
      }
      i += attr[0].length;
    }
    const close = at(/\s*(\/?>)/y, text, i);
    if (!close) continue;
    const closeAt = i + close[0].length - close[1].length;
    out.push(["punctuation", closeAt, (i += close[0].length)]);
    if (open[1] !== "<" || (name !== "style" && name !== "script")) continue;
    const endTag = text.toLowerCase().indexOf(`</${name}`, i);
    const stop = endTag < 0 || endTag > to ? to : endTag;
    if (name === "style") tokenizeCss(text, i, stop, out);
    else if (!type || /module|javascript|json/.test(type)) tokenizeJs(text, i, stop, out);
    i = stop;
  }
}

const TOKENIZERS = { html: tokenizeHtml, css: tokenizeCss, js: tokenizeJs };

/**
 * The block's language: a language-* class or data-lang on the code or pre,
 * else a guess from the text. Null for languages we do not highlight.
 * @param {HTMLElement} code
 * @param {string} text
 * @returns {keyof typeof TOKENIZERS | null}
 */
function languageOf(code, text) {
  const pre = /** @type {HTMLElement} */ (code.parentElement);
  const named = code.className.match(/\blang(?:uage)?-(\w+)/)?.[1] ?? code.dataset.lang ?? pre.dataset.lang;
  if (named) {
    const lang = named.toLowerCase();
    if (lang === "html" || lang === "xml" || lang === "svg") return "html";
    if (lang === "css") return "css";
    if (/^(?:js|mjs|javascript|json)$/.test(lang)) return "js";
    return null;
  }
  const start = text.trimStart();
  if (start.startsWith("<")) return "html";
  if (/^@[\w-]+|[^\s{};]+\s*\{\s*(?:\/\*[\s\S]*?\*\/\s*)?-?-?[a-z][\w-]*\s*:[^;{}]*;/im.test(start)) return "css";
  return "js";
}

/** @param {HTMLElement} code @param {Map<string, Range[]>} ranges */
function highlightBlock(code, ranges) {
  /** @type {Text[]} */
  const nodes = [];
  const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) nodes.push(/** @type {Text} */ (walker.currentNode));
  const text = nodes.map((n) => n.data).join("");
  const lang = languageOf(code, text);
  if (!lang) return;
  /** @type {Token[]} */
  const tokens = [];
  TOKENIZERS[lang](text, 0, text.length, tokens);

  // Offsets in `text` to positions in the text nodes.
  const starts = nodes.map(((sum) => (n) => ((sum += n.data.length), sum - n.data.length))(0));
  /** @param {number} offset @returns {[Text, number]} */
  const point = (offset) => {
    let k = starts.length - 1;
    while (k > 0 && starts[k] > offset) k--;
    return [nodes[k], offset - starts[k]];
  };
  for (const [name, start, end] of tokens) {
    if (end <= start) continue;
    const range = new Range();
    range.setStart(...point(start));
    range.setEnd(...point(end));
    const list = ranges.get(name) ?? [];
    list.push(range);
    ranges.set(name, list);
  }
}

function highlightAll() {
  /** @type {Map<string, Range[]>} */
  const ranges = new Map();
  for (const code of document.querySelectorAll("pre > code")) {
    if (code instanceof HTMLElement) highlightBlock(code, ranges);
  }
  for (const [name, list] of ranges) CSS.highlights.set(`dui-code-${name}`, new Highlight(...list));
}

if (typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", highlightAll);
  else highlightAll();
}
