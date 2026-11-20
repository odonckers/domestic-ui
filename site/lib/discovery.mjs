// @ts-check
/*
 * Discovery: read the repository and return the model every page,
 * README.md and llms*.txt are generated from. Nothing here is hard-coded
 * per component, token group or principle; adding a file under css/ or
 * examples/ is enough for it to appear (see site/README.md).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { comments, dedent, headerComment, parseHeader, parseLayerOrder, parseTokenGroups, specLabel } from "./css-comments.mjs";
import { splitSections, tokenize, plainText } from "./markdown.mjs";
import { byString, readTitle, slugify } from "./util.mjs";

/** Component groups under css/components/, and the milestone each lands in. */
export const COMPONENT_GROUPS = /** @type {const} */ ([
  { group: "atoms", title: "Atoms", milestone: "M2" },
  { group: "molecules", title: "Molecules", milestone: "M2" },
  { group: "organisms", title: "Organisms", milestone: "M3" },
]);

/**
 * @typedef {{ name: string, code: string, source: string, from: "snippet" | "main" | "css-comment" }} Snippet
 * @typedef {{ label: string, url: string }} Spec
 * @typedef {object} Component
 * @property {string} group      atoms | molecules | organisms | layout | utilities | base
 * @property {string} name       file name without extension
 * @property {string} title
 * @property {string} summary
 * @property {string} cssPath    repo path of the CSS file (first file for base)
 * @property {string | null} examplePath repo path of the standalone example page
 * @property {string | null} api API block, as written
 * @property {string[]} apiInline "API: …" one-liners
 * @property {string[]} notes    prose paragraphs after the summary
 * @property {string} a11y       accessibility notes, Markdown
 * @property {boolean} a11yFromOverride
 * @property {Spec[]} specs
 * @property {Snippet[]} snippets
 * @property {string[]} usedIn   examples whose markup uses the API
 * @property {{ path: string, summary: string }[]} files  (base only) every file in css/base/
 * @property {string | null} overridePath
 * @property {string} sitePath
 */

/**
 * Parse simple front matter: `key: value` and `- item` lists only.
 * @param {string} text
 * @returns {{ data: Record<string, string | string[]>, body: string }}
 */
export function parseFrontMatter(text) {
  const m = text.replace(/\r\n?/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  /** @type {Record<string, string | string[]>} */
  const data = {};
  let key = "";
  for (const line of m[1].split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/) ?? line.match(/^-\s+(.*)$/);
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (item && key) {
      const list = Array.isArray(data[key]) ? data[key] : (data[key] = []);
      /** @type {string[]} */ (list).push(item[1].trim());
    } else if (pair) {
      key = pair[1];
      data[key] = pair[2].trim();
    }
  }
  return { data, body: m[2].trim() };
}

/**
 * Snippets of an example page, per the snippet convention in site/README.md.
 * Regions between <!-- dui:snippet --> and <!-- /dui:snippet --> (optionally
 * name="…") are used verbatim; otherwise the inner content of <main>. Either
 * way the line break after the opening marker and the indentation before the
 * closing marker are dropped, then the lines are dedented. Never reformatted.
 * @param {string} html
 * @param {string} source repo path, recorded on each snippet
 * @returns {Snippet[]}
 */
export function extractSnippets(html, source) {
  const regions = [...html.matchAll(/<!--\s*dui:snippet(?:\s+name="([^"]*)")?\s*-->([\s\S]*?)<!--\s*\/dui:snippet\s*-->/g)];
  if (regions.length) return regions.map((m) => ({ name: m[1] ?? "", code: trimRegion(m[2]), source, from: "snippet" }));
  const main = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i);
  return main ? [{ name: "", code: trimRegion(main[1]), source, from: "main" }] : [];
}

/** @param {string} region */
function trimRegion(region) {
  const lines = region.split("\n");
  if (lines.length > 1 && !lines[0].trim()) lines.shift();
  if (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
  return dedent(lines).text;
}

/** "visually-hidden" → "Visually hidden". @param {string} name */
const titleFromName = (name) => {
  const words = name.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Where the markup API is used in the examples: a class="x" or an
 * attribute name from the first API line.
 * @param {string | null} api
 * @param {{ path: string, html: string }[]} pages
 */
function findUsage(api, pages) {
  const first = api?.split("\n")[0].trim() ?? "";
  const klass = first.match(/^class="([\w-]+)"/);
  const attr = first.match(/^([a-z][\w-]*)(?:=|$)/);
  /** @type {RegExp | null} */
  let re = null;
  if (klass) re = new RegExp(`class="(?:[^"]*\\s)?${klass[1]}(?:\\s[^"]*)?"`);
  else if (attr && attr[1] !== "class") re = new RegExp(`\\s${attr[1]}(?:[=\\s>])`);
  return re ? pages.filter((p) => re.test(p.html)).map((p) => p.path) : [];
}

/**
 * @param {string} root repository root
 */
export function loadModel(root) {
  const read = (/** @type {string} */ p) => readFileSync(join(root, p), "utf8");
  const exists = (/** @type {string} */ p) => existsSync(join(root, p));
  const list = (/** @type {string} */ dir, /** @type {string} */ ext) =>
    exists(dir)
      ? readdirSync(join(root, dir), { withFileTypes: true })
          .filter((e) => e.isFile() && e.name.endsWith(ext))
          .map((e) => e.name)
          .sort(byString)
      : [];
  const dirs = (/** @type {string} */ dir) =>
    exists(dir)
      ? readdirSync(join(root, dir), { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
          .sort(byString)
      : [];

  // Examples: examples/*.html and examples/*/*.html.
  const examples = [
    ...list("examples", ".html").map((f) => ({ path: `examples/${f}`, group: "" })),
    ...dirs("examples").flatMap((d) => list(`examples/${d}`, ".html").map((f) => ({ path: `examples/${d}/${f}`, group: d }))),
  ].map((e) => {
    const html = read(e.path);
    return { ...e, html, title: readTitle(html) || e.path };
  });

  // Principles: one section per "## " heading.
  const principlesMd = read("PRINCIPLES.md");
  const { intro, sections } = splitSections(principlesMd, 2);
  const principles = {
    intro: intro.replace(/^#\s+.*\n+/, "").trim(),
    sections: sections.map((s) => {
      const title = plainText(s.heading.replace(/^\d+\.\s+/, ""));
      const slug = slugify(s.heading);
      return { heading: s.heading, title, slug, body: s.body, sitePath: `principles/${slug}.html` };
    }),
  };

  // Token purposes, from PRINCIPLES.md's semantic token table.
  /** @type {Map<string, string>} */
  const purposes = new Map();
  for (const block of tokenize(principlesMd)) {
    if (block.type !== "table") continue;
    for (const [first, second] of block.rows.slice(1)) {
      const name = first?.match(/^`(--dui-[\w-]+)`$/);
      if (name && second) purposes.set(name[1], second);
    }
  }
  const tokenGroups = parseTokenGroups(read("css/tokens/semantic.css")).map((g) => ({
    ...g,
    sitePath: `tokens/${g.slug}.html`,
    tokens: g.tokens.map((t) => ({ ...t, purpose: purposes.get(t.name) ?? "" })),
  }));

  const override = (/** @type {string} */ key) => {
    const path = `site/content/components/${key}.md`;
    return exists(path) ? { path, ...parseFrontMatter(read(path)) } : null;
  };

  /**
   * @param {string} group
   * @param {string} cssPath
   * @param {string | null} examplePath
   * @returns {Component}
   */
  const component = (group, cssPath, examplePath) => {
    const name = cssPath.replace(/^.*\//, "").replace(/\.css$/, "");
    const css = read(cssPath);
    const doc = parseHeader(headerComment(css), comments(css));
    const over = override(`${group}/${name}`);
    const snippets = examplePath
      ? extractSnippets(read(examplePath), examplePath)
      : doc.example
        ? [{ name: "", code: doc.example, source: cssPath, from: /** @type {const} */ ("css-comment") }]
        : [];
    return {
      group,
      name,
      title: str(over?.data.title) || titleFromName(name),
      summary: str(over?.data.summary) || doc.summary,
      cssPath,
      examplePath,
      api: doc.api,
      apiInline: doc.apiInline,
      notes: [...restOfFirst(doc.prose[0] ?? "", doc.summary), ...doc.prose.slice(1)],
      a11y: over?.body || doc.a11y.join(" "),
      a11yFromOverride: Boolean(over?.body),
      specs: specsFrom(over?.data.specs, doc.urls),
      snippets,
      usedIn: examplePath ? [] : findUsage(doc.api, examples),
      files: [],
      overridePath: over?.path ?? null,
      sitePath: `components/${group}/${name}.html`,
    };
  };

  /** @type {Record<string, Component[]>} */
  const components = {};
  for (const { group } of COMPONENT_GROUPS) {
    components[group] = list(`css/components/${group}`, ".css").map((f) => {
      const example = `examples/${group}/${f.replace(/\.css$/, ".html")}`;
      return component(group, `css/components/${group}/${f}`, exists(example) ? example : null);
    });
  }
  const layout = list("css/layout", ".css").map((f) => component("layout", `css/layout/${f}`, null));
  const utilities = list("css/utilities", ".css").map((f) => component("utilities", `css/utilities/${f}`, null));

  // Base elements: one page for every file in css/base/, live example examples/base.html.
  const baseFiles = list("css/base", ".css").map((f) => {
    const css = read(`css/base/${f}`);
    return { path: `css/base/${f}`, css, doc: parseHeader(headerComment(css), comments(css)) };
  });
  const baseOver = override("base");
  const baseExample = exists("examples/base.html") ? "examples/base.html" : null;
  const allUrls = [...new Set(baseFiles.flatMap((f) => findAllUrls(f.css)))];
  /** @type {Component} */
  const base = {
    group: "base",
    name: "base",
    title: str(baseOver?.data.title) || "Base elements",
    summary: str(baseOver?.data.summary) || "Native HTML elements styled by the base layer.",
    cssPath: "css/base/",
    examplePath: baseExample,
    api: null,
    apiInline: [...new Set(baseFiles.flatMap((f) => f.doc.apiInline))],
    notes: [],
    a11y: baseOver?.body || baseFiles.flatMap((f) => f.doc.a11y).join(" "),
    a11yFromOverride: Boolean(baseOver?.body),
    specs: specsFrom(baseOver?.data.specs, allUrls),
    snippets: baseExample ? extractSnippets(read(baseExample), baseExample) : [],
    usedIn: [],
    files: baseFiles.map((f) => {
      const text = (f.doc.label || f.doc.summary).replace(/^Base:\s*/, "");
      return { path: f.path, summary: text.charAt(0).toUpperCase() + text.slice(1) };
    }),
    overridePath: baseOver?.path ?? null,
    sitePath: "components/base.html",
  };

  return {
    root,
    intro: read("site/content/readme-intro.md").trim(),
    layers: parseLayerOrder(read("css/domestic.css")),
    principles,
    tokenGroups,
    components,
    layout,
    utilities,
    base,
    examples: examples.map(({ path, group, title }) => ({ path, group, title })),
  };
}

/** @param {unknown} v */
const str = (v) => (typeof v === "string" ? v : "");

/** Prose left in the first paragraph after its first sentence. @param {string} first @param {string} summary */
const restOfFirst = (first, summary) => {
  const rest = first.startsWith(summary) ? first.slice(summary.length).trim() : "";
  return rest ? [rest] : [];
};

/** Every URL in every comment of a CSS file. @param {string} css */
const findAllUrls = (css) => comments(css).flatMap((c) => [...c.matchAll(/https?:\/\/[^\s<>"'`]+/g)].map((m) => m[0].replace(/[.,;:)]+$/, "")));

/**
 * Specs from front matter ("Label: https://…") or else from URLs, labelled by host.
 * @param {unknown} declared
 * @param {string[]} urls
 * @returns {Spec[]}
 */
function specsFrom(declared, urls) {
  if (Array.isArray(declared) && declared.length) {
    return declared.map((line) => {
      const m = String(line).match(/^(.*?):\s+(https?:\/\/\S+)$/);
      return m ? { label: m[1], url: m[2] } : { label: specLabel(String(line)), url: String(line) };
    });
  }
  return urls.map((url) => ({ label: specLabel(url), url }));
}

/** @typedef {ReturnType<typeof loadModel>} Model */
