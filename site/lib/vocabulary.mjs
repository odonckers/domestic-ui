// @ts-check
/*
 * The markup vocabulary: every attribute, word, class, custom property and
 * custom element a page may use, read from the API blocks of the header
 * comments under css/ (PRINCIPLES.md, "One API per thing") and from the
 * file names under css/themes/ and web-components/. The docs build prints
 * it for agents (llms.txt), and scripts/check-markup.mjs checks pages
 * against it, so the list an agent reads is the list a page is held to.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { comments, headerComment, parseHeader } from "./css-comments.mjs";

/**
 * @typedef {object} AttributeApi
 * @property {Set<string>} words   space-separated words it accepts ("" excluded)
 * @property {boolean} bare        it is also documented with no value (or an empty one)
 * @property {Set<string>} files   CSS files that document it, relative to css/
 * @property {Set<string>} homes   the files whose API lists it first on a line: its own docs
 *
 * @typedef {object} Vocabulary
 * @property {Map<string, AttributeApi>} attributes  data-* attributes
 * @property {Map<string, string>} classes           class name → file
 * @property {Map<string, string>} knobs             documented custom properties (--stack-gap, --dui-size-sidebar) → file
 * @property {Set<string>} tokens                    semantic --dui-* tokens (public theming API)
 * @property {Map<string, string>} elements          custom element name → file under web-components/
 * @property {Map<string, Set<string>>} selectorWords data-* words used in CSS selectors, for the drift check
 */

/** Words in one quoted value: split on spaces, "|" and brackets; placeholders dropped. @param {string} value */
const wordsOf = (value) =>
  value
    .split(/[\s|[\]]+/)
    .map((w) => w.trim())
    .filter((w) => w && /^[\w:.-]+$/.test(w));

/**
 * Read one block of API text into the vocabulary.
 * @param {Vocabulary} vocab
 * @param {string} text
 * @param {string} file
 */
function readApi(vocab, text, file) {
  // data-x, data-x="a | b", data-x="light" | "dark"
  for (const m of text.matchAll(/\b(data-[a-z][a-z-]*)((?:\s*(?:=|\|)\s*"[^"]*")*)/g)) {
    const [, name, tail] = m;
    const entry = vocab.attributes.get(name) ?? { words: new Set(), bare: false, files: new Set(), homes: new Set() };
    entry.files.add(file);
    const lineStart = text.lastIndexOf("\n", (m.index ?? 0) - 1) + 1;
    if (!text.slice(lineStart, m.index).trim()) entry.homes.add(file);
    const values = [...tail.matchAll(/"([^"]*)"/g)].map((v) => v[1]);
    if (!values.length) entry.bare = true;
    for (const v of values) {
      const words = wordsOf(v);
      if (!words.length || /^\s*\[/.test(v)) entry.bare = true; // "" or "[a | b]" (optional)
      for (const w of words) entry.words.add(w);
    }
    vocab.attributes.set(name, entry);
  }
  // "(empty means neutral)": the attribute named last before it also works with no value.
  for (const m of text.matchAll(/empty means\b/gi)) {
    const before = [...text.slice(0, m.index).matchAll(/\b(data-[a-z][a-z-]*)/g)].at(-1);
    const entry = before && vocab.attributes.get(before[1]);
    if (entry) entry.bare = true;
  }
  for (const m of text.matchAll(/\bclass="([^"]+)"/g)) for (const c of wordsOf(m[1])) vocab.classes.set(c, file);
  // A line that opens with custom properties: "--a", or "--a, --b", then two spaces and its description.
  for (const m of text.matchAll(/^\s*(--[a-z][a-z0-9-]*(?:,\s*--[a-z][a-z0-9-]*)*)/gm)) for (const k of m[1].split(/,\s*/)) vocab.knobs.set(k, file);
}

/** Every *.css file under a folder, relative to it, sorted. @param {string} dir */
const cssFiles = (dir) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".css"))
    .map((f) => f.split("\\").join("/"))
    .sort();

/**
 * @param {string} root repository root
 * @returns {Vocabulary}
 */
export function loadVocabulary(root) {
  /** @type {Vocabulary} */
  const vocab = { attributes: new Map(), classes: new Map(), knobs: new Map(), tokens: new Set(), elements: new Map(), selectorWords: new Map() };
  const cssDir = join(root, "css");
  for (const file of cssFiles(cssDir)) {
    const css = readFileSync(join(cssDir, file), "utf8");
    const doc = parseHeader(headerComment(css));
    if (doc.api) readApi(vocab, doc.api, file);
    // "API: …" paragraphs in any comment, read to the end of the paragraph.
    for (const c of comments(css)) for (const m of c.matchAll(/^\s*API:\s+(\S[\s\S]*?)(?=\n\s*\n|(?![\s\S]))/gm)) readApi(vocab, m[1], file);
    // A theme is applied with data-theme="<file name>".
    if (file.startsWith("themes/")) {
      const name = file.slice("themes/".length, -".css".length);
      const entry = vocab.attributes.get("data-theme") ?? { words: new Set(), bare: false, files: new Set(), homes: new Set() };
      entry.words.add(name);
      entry.files.add(file);
      entry.homes.add(file);
      vocab.attributes.set("data-theme", entry);
    }
    if (file === "tokens/semantic.css") for (const m of css.matchAll(/^\s*(--dui-[a-z0-9-]+)\s*:/gm)) vocab.tokens.add(m[1]);
    for (const m of css.matchAll(/\[(data-[a-z][a-z-]*)[~|^$*]?="([^"]*)"\]/g)) {
      const set = vocab.selectorWords.get(m[1]) ?? new Set();
      for (const w of wordsOf(m[2])) set.add(w);
      vocab.selectorWords.set(m[1], set);
    }
  }
  const wcDir = join(root, "web-components");
  for (const f of (existsSync(wcDir) ? readdirSync(wcDir) : []).filter((f) => /^dui-[a-z-]+\.js$/.test(f)).sort()) vocab.elements.set(f.slice(0, -3), `web-components/${f}`);
  return vocab;
}

/**
 * Words used in CSS selectors that no API block documents: a page could
 * use them, but an agent reading the docs would never find them.
 * @param {Vocabulary} vocab
 * @returns {string[]} "data-x=\"word\"" entries
 */
export function undocumentedWords(vocab) {
  const out = [];
  for (const [name, words] of vocab.selectorWords) {
    const api = vocab.attributes.get(name);
    for (const w of words) if (!api?.words.has(w)) out.push(`${name}="${w}"`);
  }
  return out.sort();
}

/**
 * The vocabulary as compact Markdown: one line per attribute with its
 * words, then classes, custom elements and knobs.
 * @param {Vocabulary} vocab
 * @param {(cssFile: string) => string | null} [pageOf] docs page (site: link) of a file under css/, to link each attribute
 */
export function vocabularyMd(vocab, pageOf = () => null) {
  const code = (/** @type {string} */ s) => `\`${s}\``;
  const attrs = [...vocab.attributes]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, a]) => {
      const words = [...a.words].sort();
      const value = words.length ? `${a.bare ? "bare, or " : ""}${words.map(code).join(", ")}` : "bare";
      const pages = [...new Set([...(a.homes.size ? a.homes : a.files)].map(pageOf).filter(Boolean))];
      return `- ${code(name)}: ${value}${pages.length ? ` (${pages.map((p) => `[docs](site:${p})`).join(", ")})` : ""}`;
    });
  const list = (/** @type {Iterable<string>} */ names) => [...names].sort().map(code).join(", ");
  return [
    "Attributes (words combine, space-separated, where it makes sense: `data-button=\"primary small\"`):",
    "",
    ...attrs,
    "",
    `Classes: ${list(vocab.classes.keys())}.`,
    "",
    `Custom elements (load \`web-components/<name>.js\` as a module): ${list(vocab.elements.keys())}.`,
    "",
    `Knobs, the only custom properties a \`style\` attribute should set besides semantic \`--dui-*\` tokens: ${list(vocab.knobs.keys())}.`,
  ].join("\n");
}
