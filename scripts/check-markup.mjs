#!/usr/bin/env node
// @ts-check
/*
 * Markup check: pages are written in the documented vocabulary only.
 *
 *   node scripts/check-markup.mjs              the repository's pages (below)
 *   node scripts/check-markup.mjs page.html…   your own pages, strictly
 *
 * The vocabulary is read from the API blocks of the CSS header comments
 * (site/lib/vocabulary.mjs), the same list llms.txt prints for agents.
 *
 * Strict (examples/pages/, demos/vanilla/ and any file you name): the page
 * needs no CSS of its own.
 *   - no <style> element, and stylesheets only from css/ (domestic.css,
 *     a theme, the optional font);
 *   - a style attribute only sets documented knobs (--stack-gap, …) or
 *     semantic --dui-* tokens;
 *   - every class, data-* attribute and word is documented;
 *   - every dui-* element exists and its module is loaded.
 * Every other example under examples/ (docs pages with their own page
 * chrome) is checked for the last two only, and may use classes and words
 * its own <style> defines (page chrome, a custom data-theme).
 *
 * It also fails when a CSS selector matches a data-* word no API block
 * documents, since an agent reading the docs would never find it.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadVocabulary, undocumentedWords } from "../site/lib/vocabulary.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** HTML files under a folder, relative to the root, sorted. @param {string} dir */
const htmlUnder = (dir) =>
  existsSync(join(ROOT, dir))
    ? readdirSync(join(ROOT, dir), { recursive: true })
        .map(String)
        .filter((f) => f.endsWith(".html"))
        .map((f) => `${dir}/${f.split("\\").join("/")}`)
        .sort()
    : [];

/** Folders whose pages must need no CSS of their own. */
const STRICT_DIRS = ["examples/pages", "demos/vanilla"];

/** Stylesheets a strict page may link, by the end of their path. */
const STYLESHEETS = [/(^|\/)css\/domestic\.css$/, /(^|\/)css\/themes\/[a-z-]+\.css$/, /(^|\/)css\/fonts\/inter\.css$/];

const TAG_RE = /<([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * Tags with their attributes and line numbers. Comments and the contents
 * of <script> and <style> are blanked first, keeping line breaks.
 * @param {string} html
 */
function tags(html) {
  const blank = (/** @type {string} */ s) => s.replace(/[^\n]/g, " ");
  const text = html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (_, open, _name, body, close) => open + blank(body) + close);
  return [...text.matchAll(TAG_RE)].map((m) => {
    /** @type {Map<string, string>} */
    const attrs = new Map();
    for (const a of (m[2] ?? "").matchAll(ATTR_RE)) attrs.set(a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? "");
    return { name: m[1].toLowerCase(), attrs, line: text.slice(0, m.index).split("\n").length };
  });
}

/** Class names a page's own <style> defines. @param {string} html */
const localClasses = (html) =>
  new Set([...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].flatMap((m) => [...m[1].matchAll(/\.([a-zA-Z][\w-]*)/g)].map((c) => c[1])));

/** data-* words a page's own <style> defines: [data-x="word"] and [data-x~="word"]. @param {string} html */
function localWords(html) {
  /** @type {Map<string, Set<string>>} */
  const local = new Map();
  for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const m of style[1].matchAll(/\[(data-[a-z][a-z-]*)(?:[~|^$*]?="([^"]*)")?\]/g)) {
      const set = local.get(m[1]) ?? new Set();
      for (const w of (m[2] ?? "").split(/\s+/).filter(Boolean)) set.add(w);
      local.set(m[1], set);
    }
  }
  return local;
}

/**
 * @param {import("../site/lib/vocabulary.mjs").Vocabulary} vocab
 * @param {string} file path relative to the root, or absolute
 * @param {boolean} strict
 * @returns {string[]} problems, as "file:line message"
 */
export function checkPage(vocab, file, strict) {
  const html = readFileSync(resolve(ROOT, file), "utf8");
  const local = strict ? new Map() : localWords(html);
  const ownClasses = strict ? new Set() : localClasses(html);
  const where = (/** @type {number} */ line) => `${relative(ROOT, resolve(ROOT, file))}:${line}`;
  const problems = [];
  const all = tags(html);
  const scripts = all.filter((t) => t.name === "script").map((t) => t.attrs.get("src") ?? "");
  /** @type {Set<string>} */
  const reported = new Set();

  for (const { name, attrs, line } of all) {
    const at = where(line);
    if (strict && name === "style") problems.push(`${at} <style> element: a page needs no CSS of its own; use the documented attributes, layout classes and knobs`);
    if (strict && name === "link" && /\bstylesheet\b/i.test(attrs.get("rel") ?? "")) {
      const href = (attrs.get("href") ?? "").split(/[?#]/)[0];
      if (!STYLESHEETS.some((re) => re.test(href))) problems.push(`${at} stylesheet "${href}" is not css/domestic.css, a theme or css/fonts/inter.css`);
    }
    if (name.startsWith("dui-")) {
      if (!vocab.elements.has(name)) problems.push(`${at} <${name}> is not a domestic-ui element (known: ${[...vocab.elements.keys()].join(", ")})`);
      else if (!scripts.some((src) => src.endsWith(`/${name}.js`) || src === `${name}.js`) && !reported.has(name)) {
        reported.add(name);
        problems.push(`${at} <${name}> is used but web-components/${name}.js is not loaded`);
      }
    }
    for (const [attr, value] of attrs) {
      if (strict && attr === "style") {
        for (const decl of value.split(";").map((d) => d.trim()).filter(Boolean)) {
          const prop = decl.split(":")[0].trim();
          if (!vocab.knobs.has(prop) && !vocab.tokens.has(prop)) problems.push(`${at} style="${decl}": only documented knobs and semantic --dui-* tokens may be set inline`);
        }
      }
      if (attr === "class") {
        for (const c of value.split(/\s+/).filter(Boolean)) {
          if (!vocab.classes.has(c) && !ownClasses.has(c) && !/^theme-/.test(c)) problems.push(`${at} class "${c}" is not documented (classes: ${[...vocab.classes.keys()].join(", ")})`);
        }
      }
      if (!attr.startsWith("data-")) continue;
      const api = vocab.attributes.get(attr);
      if (!api) {
        if (strict) problems.push(`${at} ${attr} is not a domestic-ui attribute`);
        continue;
      }
      const words = value.split(/\s+/).filter(Boolean);
      if (!words.length && !api.bare && !local.has(attr)) problems.push(`${at} ${attr} needs a value: ${[...api.words].join(", ")}`);
      for (const w of words) {
        if (!api.words.has(w) && !local.get(attr)?.has(w)) problems.push(`${at} ${attr}="${value}": "${w}" is not documented (${[...api.words].join(", ") || "takes no value"})`);
      }
    }
  }
  return problems;
}

/** @param {string[]} args */
export function run(args) {
  const vocab = loadVocabulary(ROOT);
  const problems = undocumentedWords(vocab).map((w) => `css: ${w} is used in a selector but no API block documents it`);
  /** @type {[string, boolean][]} */
  const files = args.length
    ? args.map((f) => [f, true])
    : [
        ...STRICT_DIRS.flatMap((d) => htmlUnder(d)).map((f) => /** @type {[string, boolean]} */ ([f, true])),
        ...htmlUnder("examples")
          .filter((f) => !STRICT_DIRS.some((d) => f.startsWith(`${d}/`)))
          .map((f) => /** @type {[string, boolean]} */ ([f, false])),
      ];
  for (const [file, strict] of files) problems.push(...checkPage(vocab, file, strict));
  return { files: files.length, problems };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { files, problems } = run(process.argv.slice(2));
  if (problems.length) {
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} markup problem${problems.length === 1 ? "" : "s"} in ${files} file${files === 1 ? "" : "s"}.`);
    process.exit(1);
  }
  console.log(`Markup check: ${files} files use the documented vocabulary only.`);
}
