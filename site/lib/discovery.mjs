// @ts-check
/*
 * Discovery: read the repository and return the model every page,
 * README.md and llms*.txt are generated from. Nothing here is hard-coded
 * per component, token group or principle; adding a file under css/ or
 * examples/ is enough for it to appear (see site/README.md).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { comments, dedent, headerComment, htmlKeyboard, parseHeader, parseKeyboard, parseLayerOrder, specLabel } from "./css-comments.mjs";
import { splitSections, tokenize, plainText } from "./markdown.mjs";
import { parseTokenFile, resolveTokens } from "./tokens.mjs";
import { byString, firstSentence, readTitle, slugify, unescapeHtml } from "./util.mjs";

/** Component groups under css/components/, and the milestone each lands in. */
export const COMPONENT_GROUPS = /** @type {const} */ ([
  { group: "atoms", title: "Atoms", milestone: "M2" },
  { group: "molecules", title: "Molecules", milestone: "M3" },
  { group: "organisms", title: "Organisms", milestone: "M3b" },
]);

/**
 * The levels the docs are organized by, in order. A pattern's `level`
 * front matter (molecule, organism, layout, token) maps to one of these.
 */
export const LEVELS = /** @type {const} */ ([
  { level: "tokens", title: "Tokens", singular: "token" },
  { level: "atoms", title: "Atoms", singular: "atom" },
  { level: "molecules", title: "Molecules", singular: "molecule" },
  { level: "organisms", title: "Organisms", singular: "organism" },
  { level: "layouts", title: "Layouts", singular: "layout" },
]);

/** Layout primitives may live in any of these; the first file of a name wins. */
export const LAYOUT_CSS_DIRS = /** @type {const} */ (["css/layout", "css/layouts", "css/components/layouts"]);
/** Standalone layout examples, joined to the CSS by file name. */
export const LAYOUT_EXAMPLE_DIRS = /** @type {const} */ (["examples/layout", "examples/layouts"]);
/** Where a pattern's example page is looked for, in order. */
export const PATTERN_EXAMPLE_DIRS = /** @type {const} */ (["molecules", "organisms", "layouts", "layout", "patterns"]);

/**
 * @typedef {{ name: string, code: string, source: string, from: "snippet" | "pre" | "main" | "css-comment" }} Snippet
 * @typedef {{ label: string, url: string }} Spec
 * @typedef {{ key: string, action: string }} Key
 * @typedef {object} Component
 * @property {string} group      atoms | molecules | organisms | layouts | utilities | base
 * @property {string} name       slug: CSS file name, or the example file name for an index row with no CSS file
 * @property {string} title      front matter, else the index row's name, else from the file name
 * @property {string} summary    front matter, else the example's meta description, else the header's first sentence
 * @property {string} subtitle   the header's label line after its colon ("button variants, sizes and states")
 * @property {string} cssPath    repo path of the CSS file (first file for base; the linked base file for a row with no CSS of its own)
 * @property {boolean} ownCss    false for an index row such as "Form controls | none: css/base/forms.css"
 * @property {string | null} examplePath repo path of the standalone example page
 * @property {string | null} api API block, as written
 * @property {string[]} apiInline "API: …" one-liners
 * @property {string | null} indexApi the group README index row's API cell, inline Markdown
 * @property {string | null} indexPath repo path of that README
 * @property {{ label: string, text: string }[]} blocks labelled header blocks (States, Sizes, Focus, …)
 * @property {Key[]} keyboard    the header's Keyboard block
 * @property {string[]} choices  the group README's Our choices bullets about this component
 * @property {string[]} notes    prose paragraphs after the summary
 * @property {string} a11y       accessibility notes, Markdown
 * @property {boolean} a11yFromOverride
 * @property {Spec[]} specs
 * @property {Snippet[]} snippets
 * @property {string[]} usedIn   examples whose markup uses the API
 * @property {{ path: string, summary: string }[]} files  (base only) every file in css/base/
 * @property {string | null} overridePath
 * @property {string} ourChoice  why, when no native element or APG pattern covers it ("" otherwise)
 * @property {string} sitePath
 *
 * @typedef {object} Pattern
 * @property {string} slug
 * @property {string} title
 * @property {string} summary     Markdown
 * @property {string} milestone   M3 | M3b
 * @property {string} level       one of LEVELS[].level
 * @property {Spec[]} standards   the standards it follows (label is Markdown)
 * @property {string} ourChoice   Markdown, only when no standard exists
 * @property {Spec[]} specs       further reading
 * @property {Key[]} keyboard     resolved: example comment, else CSS header, else front matter
 * @property {"example" | "css" | "front matter" | ""} keyboardFrom
 * @property {string} keyboardSource repo path the keyboard notes came from
 * @property {string[]} names     file names (without extension) that fill it in
 * @property {string[]} examplePaths matching example pages
 * @property {string[]} cssPaths  matching CSS files
 * @property {import("./css-comments.mjs").HeaderDoc | null} doc header comment of the first CSS file
 * @property {Snippet[]} snippets
 * @property {boolean} available  true once an example page or CSS file exists
 * @property {string} body        Markdown after the front matter
 * @property {string} contentPath
 * @property {string} sitePath
 *
 * @typedef {object} Guide
 * @property {string} slug
 * @property {string} title
 * @property {string} summary
 * @property {string} body       Markdown, with {{patterns: …}} and {{layouts}} lines
 * @property {string} contentPath
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
 * Snippets of an example page, per the snippet convention in site/README.md,
 * in this order of priority:
 *
 * 1. Regions between <!-- dui:snippet --> and <!-- /dui:snippet -->
 *    (optionally name="…"): the line break after the opening marker and the
 *    indentation before the closing marker are dropped, then the lines are
 *    dedented.
 * 2. Every <pre><code>…</code></pre> inside <main>: the code content,
 *    HTML-unescaped, named by the nearest <h2> or <h3> before it.
 * 3. The inner content of <main>, trimmed and dedented like a region.
 *
 * Never reformatted.
 * @param {string} html
 * @param {string} source repo path, recorded on each snippet
 * @returns {Snippet[]}
 */
export function extractSnippets(html, source) {
  const regions = [...html.matchAll(/<!--\s*dui:snippet(?:\s+name="([^"]*)")?\s*-->([\s\S]*?)<!--\s*\/dui:snippet\s*-->/g)];
  if (regions.length) return regions.map((m) => ({ name: m[1] ?? "", code: trimRegion(m[2]), source, from: "snippet" }));
  const main = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i);
  if (!main) return [];
  const blocks = [...main[1].matchAll(/<pre\b[^>]*><code\b[^>]*>([\s\S]*?)<\/code><\/pre>/g)];
  if (blocks.length) {
    /** @type {Map<string, number>} */
    const seen = new Map();
    return blocks.map((m) => {
      const headings = [...main[1].slice(0, m.index).matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/g)];
      const last = headings[headings.length - 1];
      const base = last ? unescapeHtml(last[2].replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim() : "";
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return { name: n > 1 ? `${base} (${n})` : base, code: unescapeHtml(m[1]), source, from: /** @type {const} */ ("pre") };
    });
  }
  return [{ name: "", code: trimRegion(main[1]), source, from: "main" }];
}

/** @param {string} region */
function trimRegion(region) {
  const lines = region.split("\n");
  if (lines.length > 1 && !lines[0].trim()) lines.shift();
  if (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
  return dedent(lines).text;
}

/** Inline Markdown links: [label](href). */
const MD_LINK_RE = /\[([^\]]*)\]\(([^()\s]+)\)/g;

/**
 * Rewrite relative Markdown links in a file under `dir` to repo-root paths.
 * @param {string} md
 * @param {string} dir repo path of the file's directory
 */
const rootLinks = (md, dir) =>
  md.replace(MD_LINK_RE, (m, label, href) => (/^(?:[a-z]+:|#)/i.test(href) ? m : `[${label}](${posix.normalize(posix.join(dir, href))})`));

/**
 * @typedef {object} IndexRow
 * @property {string} title   the row's name cell, plain text
 * @property {string | null} cssPath the File cell's link, as a repo path
 * @property {boolean} ownCss  false when the File cell starts with "none" (a row with no CSS file of its own)
 * @property {string} api      the API cell, inline Markdown, `\|` unescaped
 * @property {string | null} examplePath
 * @property {Spec[]} specs    the Specs cell's links (label is inline Markdown)
 * @property {string[]} terms  attribute names in the API cell's code spans, for matching Our choices bullets
 *
 * @typedef {object} GroupReadme
 * @property {string} path
 * @property {IndexRow[]} rows        the index table, in row order
 * @property {string[]} choices       "Our choices" bullets, inline Markdown with the label kept
 * @property {string} convention      the bullet about the data-<component> attribute, or ""
 * @property {string} notShipped      the "Not shipped, and why" table, Markdown, or ""
 */

/**
 * Read css/components/<group>/README.md: the index table (columns
 * Name | File | API | Example | Specs), the "Our choices" bullets and the
 * "Not shipped, and why" table. Relative links become repo-root paths.
 * @param {string} md
 * @param {string} path
 * @returns {GroupReadme}
 */
export function parseGroupReadme(md, path) {
  const dir = posix.dirname(path);
  const text = rootLinks(md, dir);
  const links = (/** @type {string} */ cell) => [...cell.matchAll(MD_LINK_RE)].map((m) => ({ label: m[1], url: m[2] }));
  /** @type {IndexRow[]} */
  const rows = [];
  for (const block of tokenize(text)) {
    if (block.type !== "table" || block.rows[0][1] !== "File" || block.rows[0][2] !== "API") continue;
    for (const [name, file, api, example, specs = ""] of block.rows.slice(1)) {
      const css = links(file)[0]?.url ?? null;
      const terms = [...api.matchAll(/`([^`]+)`/g)].flatMap((m) => m[1].match(/^([a-z][\w-]*)(?:=|$)/)?.[1] ?? []);
      rows.push({
        title: plainText(name),
        cssPath: css,
        ownCss: Boolean(css) && !/^none\b/i.test(file),
        api,
        examplePath: links(example)[0]?.url ?? null,
        specs: links(specs).map((s) => ({ label: /^\d/.test(s.label) ? `${specLabel(s.url)} ${s.label}` : s.label, url: s.url })),
        terms: [...new Set(terms)],
      });
    }
    break;
  }
  const { sections } = splitSections(text, 2);
  const body = (/** @type {RegExp} */ re) => sections.find((s) => re.test(s.heading))?.body ?? "";
  const list = tokenize(body(/^Our choices$/i)).find((b) => b.type === "list");
  const all = list?.type === "list" ? list.items.map((i) => i.text.replace(/\s*\n\s*/g, " ")) : [];
  const convention = all.find((c) => c.includes("`data-<")) ?? "";
  const table = tokenize(body(/^Not shipped/i)).find((b) => b.type === "table");
  return { path, rows, choices: all, convention, notShipped: table?.raw ?? "" };
}

/**
 * The Our choices bullets about one component: a bullet matches when one of
 * its code spans uses an attribute from the component's API, or its text
 * names the component's title (singular or plural). The general convention
 * bullet is left out; it is shown with the component API convention.
 * @param {GroupReadme | null} readme
 * @param {string} title
 * @param {string[]} terms
 */
function choicesFor(readme, title, terms) {
  if (!readme) return [];
  const phrase = title.toLowerCase().replace(/s\b/g, "").replace(/[^\w\s-]/g, "");
  const titleRe = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}s?\\b`, "i");
  const termRes = terms.map((t) => new RegExp(`(?:^|[\\s<])${t}(?:=|$|[\\s>])`));
  return readme.choices.filter((c) => {
    if (c === readme.convention) return false;
    const codes = [...c.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    return codes.some((code) => termRes.some((re) => re.test(code))) || titleRe.test(plainText(c));
  });
}

/** The content of <meta name="description">, or "". @param {string} html */
const metaDescription = (html) => {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  return m ? unescapeHtml(m[1]).trim() : "";
};

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
    // examples/<group>/index.html is the group's showcase, never a component.
    const showcase = Boolean(e.group) && e.path.endsWith("/index.html");
    const title = showcase ? `${groupTitle(e.group)} showcase` : readTitle(html).replace(/\s+·\s+domestic-ui$/, "") || e.path;
    return { ...e, html, title, showcase };
  });

  // Demo apps: every demos/<name>/ with a README.md: its H1 (less a "domestic-ui demo: " prefix)
  // and the first sentence of its first paragraph, inline Markdown with repo-root links.
  const demos = dirs("demos")
    .filter((d) => exists(`demos/${d}/README.md`))
    .map((d) => {
      const blocks = tokenize(rootLinks(read(`demos/${d}/README.md`), `demos/${d}`));
      const h1 = blocks.find((b) => b.type === "heading" && b.level === 1);
      const title = h1?.type === "heading" ? plainText(h1.text).replace(/^domestic-ui demos?:\s*/i, "") : d;
      const para = blocks.find((b) => b.type === "paragraph");
      const description = para?.type === "paragraph" ? firstSentence(para.text) : "";
      return { name: d, title: title.charAt(0).toUpperCase() + title.slice(1), path: `demos/${d}/`, description };
    });
  const demosIntro = exists("demos/README.md") ? (tokenize(rootLinks(read("demos/README.md"), "demos")).find((b) => b.type === "paragraph")?.raw ?? "") : "";

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
  // Every file in css/tokens/, resolved together so semantic values resolve through primitives.
  const tokenFiles = resolveTokens(list("css/tokens", ".css").map((f) => parseTokenFile(read(`css/tokens/${f}`), `css/tokens/${f}`))).map((f) => ({
    ...f,
    groups: f.groups.map((g) => ({ ...g, tokens: g.tokens.map((t) => ({ ...t, purpose: purposes.get(t.name) ?? "" })) })),
  }));

  const override = (/** @type {string} */ key) => {
    const path = `site/content/components/${key}.md`;
    return exists(path) ? { path, ...parseFrontMatter(read(path)) } : null;
  };

  /**
   * @param {string} group
   * @param {string} cssPath
   * @param {string | null} examplePath
   * @param {{ row: IndexRow, readme: GroupReadme } | null} [indexed] the group README's index row, when it has one
   * @returns {Component}
   */
  const component = (group, cssPath, examplePath, indexed = null) => {
    const row = indexed?.row ?? null;
    const ownCss = row ? row.ownCss : true;
    const name = (ownCss ? cssPath : (examplePath ?? cssPath)).replace(/^.*\//, "").replace(/\.(?:css|html)$/, "");
    const css = ownCss ? read(cssPath) : "";
    const doc = parseHeader(headerComment(css), comments(css));
    const over = override(`${group}/${name}`);
    const exampleHtml = examplePath ? read(examplePath) : "";
    const snippets = examplePath
      ? extractSnippets(exampleHtml, examplePath)
      : doc.example
        ? [{ name: "", code: doc.example, source: cssPath, from: /** @type {const} */ ("css-comment") }]
        : [];
    const description = metaDescription(exampleHtml);
    const summary = str(over?.data.summary) || description || doc.summary;
    const title = str(over?.data.title) || row?.title || titleFromName(name);
    // Index specs first, then header URLs the index does not list, labelled by host.
    const indexSpecs = row?.specs ?? [];
    const known = new Set(indexSpecs.map((s) => s.url));
    const headerSpecs = specsFrom(over?.data.specs, doc.urls).filter((s) => !known.has(s.url));
    return {
      group,
      name,
      title,
      summary,
      subtitle: doc.label.replace(/^[^:]+:\s*/, ""),
      cssPath,
      ownCss,
      examplePath,
      api: doc.api,
      apiInline: doc.apiInline,
      indexApi: row?.api ?? null,
      indexPath: indexed?.readme.path ?? null,
      blocks: doc.blocks,
      keyboard: doc.keyboard,
      notes: description ? doc.prose : [...restOfFirst(doc.prose[0] ?? "", doc.summary), ...doc.prose.slice(1)],
      a11y: over?.body || doc.a11y.join(" "),
      a11yFromOverride: Boolean(over?.body),
      specs: [...indexSpecs, ...headerSpecs],
      snippets,
      usedIn: examplePath ? [] : findUsage(doc.api, examples),
      files: [],
      overridePath: over?.path ?? null,
      ourChoice: str(over?.data["our-choice"]),
      choices: choicesFor(indexed?.readme ?? null, title, row?.terms ?? []),
      sitePath: group === "layouts" ? `layouts/${name}.html` : `components/${group}/${name}.html`,
    };
  };

  // Patterns: the handwritten registry. A pattern owns its file names, so a
  // matching component or layout file fills in the pattern page instead of
  // getting a page of its own.
  const patternFiles = list("site/content/patterns", ".md").map((f) => {
    const path = `site/content/patterns/${f}`;
    const slug = f.replace(/\.md$/, "");
    const { data, body } = parseFrontMatter(read(path));
    const names = [slug, ...strList(data.sources).map((s) => s.replace(/\.(?:html|css)$/, ""))];
    return { path, slug, data, body, names: [...new Set(names)] };
  });
  const owned = new Set(patternFiles.flatMap((p) => p.names));
  const unowned = (/** @type {string} */ f) => !owned.has(f.replace(/\.css$/, ""));

  // Components: the group README's index table is the source of truth for
  // its rows, in row order; CSS files it does not list follow, sorted, so
  // nothing is dropped silently.
  /** @type {Record<string, Component[]>} */
  const components = {};
  /** @type {Record<string, GroupReadme | null>} */
  const readmes = {};
  for (const { group } of COMPONENT_GROUPS) {
    const dir = `css/components/${group}`;
    const readme = exists(`${dir}/README.md`) ? parseGroupReadme(read(`${dir}/README.md`), `${dir}/README.md`) : null;
    readmes[group] = readme;
    const rows = readme?.rows ?? [];
    for (const r of rows) {
      const file = r.ownCss ? r.cssPath : r.examplePath;
      if (!file || !exists(file)) throw new Error(`${readme?.path}: the "${r.title}" row links ${file ?? "no file"}, which does not exist`);
    }
    const fromIndex = rows
      .map((row) => {
        const cssPath = /** @type {string} */ (row.cssPath ?? row.examplePath);
        const examplePath = row.examplePath && exists(row.examplePath) ? row.examplePath : null;
        return component(group, cssPath, examplePath, { row, readme: /** @type {GroupReadme} */ (readme) });
      })
      .filter((c) => !owned.has(c.name));
    const listed = new Set(rows.filter((r) => r.ownCss).map((r) => r.cssPath));
    const rest = list(dir, ".css")
      .filter(unowned)
      .filter((f) => !listed.has(`${dir}/${f}`))
      .map((f) => {
        const example = `examples/${group}/${f.replace(/\.css$/, ".html")}`;
        return component(group, `${dir}/${f}`, exists(example) ? example : null);
      });
    components[group] = [...fromIndex, ...rest];
  }

  /** @type {Map<string, string>} name → CSS path, first directory wins */
  const layoutCss = new Map();
  for (const dir of LAYOUT_CSS_DIRS) for (const f of list(dir, ".css").filter(unowned)) if (!layoutCss.has(f)) layoutCss.set(f, `${dir}/${f}`);
  const layouts = [...layoutCss.keys()].sort(byString).map((f) => {
    const example = LAYOUT_EXAMPLE_DIRS.map((d) => `${d}/${f.replace(/\.css$/, ".html")}`).find(exists) ?? null;
    return component("layouts", /** @type {string} */ (layoutCss.get(f)), example);
  });
  const utilities = list("css/utilities", ".css").map((f) => component("utilities", `css/utilities/${f}`, null));

  /** Every CSS file under css/ except base and reset, recursively. @param {string} dir @returns {string[]} */
  const walkCss = (dir) => [
    ...list(dir, ".css").map((f) => `${dir}/${f}`),
    ...dirs(dir)
      .filter((d) => !(dir === "css" && (d === "base" || d === "reset")))
      .flatMap((d) => walkCss(`${dir}/${d}`)),
  ];
  const allCss = walkCss("css");

  /** @type {Pattern[]} */
  const patterns = patternFiles.map(({ path, slug, data, body, names }) => {
    const examplePaths = names.flatMap((n) => PATTERN_EXAMPLE_DIRS.map((d) => `examples/${d}/${n}.html`)).filter(exists);
    const cssPaths = names.flatMap((n) => allCss.filter((p) => p.endsWith(`/${n}.css`)));
    const css = cssPaths[0] ? read(cssPaths[0]) : "";
    const doc = cssPaths[0] ? parseHeader(headerComment(css), comments(css)) : null;
    const snippets = examplePaths.length
      ? examplePaths.flatMap((p) => extractSnippets(read(p), p))
      : doc?.example
        ? [{ name: "", code: doc.example, source: cssPaths[0], from: /** @type {const} */ ("css-comment") }]
        : [];

    /** @type {Pattern["keyboardFrom"]} */
    let keyboardFrom = "";
    let keyboardSource = "";
    /** @type {Key[]} */
    let keyboard = [];
    for (const p of examplePaths) {
      if (keyboard.length) break;
      keyboard = htmlKeyboard(read(p));
      if (keyboard.length) [keyboardFrom, keyboardSource] = ["example", p];
    }
    for (const p of cssPaths) {
      if (keyboard.length) break;
      const c = read(p);
      keyboard = parseHeader(headerComment(c)).keyboard;
      if (keyboard.length) [keyboardFrom, keyboardSource] = ["css", p];
    }
    if (!keyboard.length) {
      keyboard = parseKeyboard(strList(data.keyboard));
      if (keyboard.length) [keyboardFrom, keyboardSource] = ["front matter", path];
    }

    const level = LEVELS.find((l) => l.singular === str(data.level) || l.level === str(data.level))?.level;
    if (!level) throw new Error(`${path}: level must be one of ${LEVELS.map((l) => l.singular).join(", ")}`);
    const milestone = str(data.milestone);
    if (!/^M\d+b?$/.test(milestone)) throw new Error(`${path}: milestone must look like M3 or M3b`);
    const standards = specsFrom(strList(data.standard), []);
    const ourChoice = str(data["our-choice"]);
    if (!standards.length && !ourChoice) throw new Error(`${path}: needs a standard or an our-choice line`);

    return {
      slug,
      title: str(data.title) || titleFromName(slug),
      summary: str(data.summary),
      milestone,
      level,
      standards,
      ourChoice,
      specs: specsFrom(strList(data.specs), []),
      keyboard,
      keyboardFrom,
      keyboardSource,
      names,
      examplePaths,
      cssPaths,
      doc,
      snippets,
      available: examplePaths.length > 0 || cssPaths.length > 0,
      body,
      contentPath: path,
      sitePath: `patterns/${slug}.html`,
    };
  });

  /** @type {Guide[]} */
  const guides = list("site/content/guides", ".md").map((f) => {
    const path = `site/content/guides/${f}`;
    const slug = f.replace(/\.md$/, "");
    const { data, body } = parseFrontMatter(read(path));
    return { slug, title: str(data.title) || titleFromName(slug), summary: str(data.summary), body, contentPath: path, sitePath: `guides/${slug}.html` };
  });

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
    subtitle: "",
    cssPath: "css/base/",
    ownCss: true,
    examplePath: baseExample,
    api: null,
    apiInline: [...new Set(baseFiles.flatMap((f) => f.doc.apiInline))],
    indexApi: null,
    indexPath: null,
    blocks: [],
    keyboard: [],
    choices: [],
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
    ourChoice: str(baseOver?.data["our-choice"]),
    sitePath: "components/base.html",
  };

  return {
    root,
    intro: read("site/content/readme-intro.md").trim(),
    layers: parseLayerOrder(read("css/domestic.css")),
    principles,
    tokenFiles,
    components,
    layouts,
    utilities,
    base,
    patterns,
    guides,
    readmes,
    demos,
    demosIntro,
    contributing: exists("CONTRIBUTING.md") ? read("CONTRIBUTING.md") : "",
    changelog: exists("CHANGELOG.md") ? read("CHANGELOG.md") : "",
    examples: examples.map(({ path, group, title, showcase }) => ({ path, group, title, showcase })),
  };
}

/** "atoms" → "Atoms", from COMPONENT_GROUPS where listed. @param {string} group */
const groupTitle = (group) => COMPONENT_GROUPS.find((g) => g.group === group)?.title ?? titleFromName(group);

/** @param {unknown} v */
const str = (v) => (typeof v === "string" ? v : "");

/** A front matter value as a list: a list as-is, one string as one item. @param {unknown} v @returns {string[]} */
const strList = (v) => (Array.isArray(v) ? v.map(String) : typeof v === "string" && v ? [v] : []);

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
