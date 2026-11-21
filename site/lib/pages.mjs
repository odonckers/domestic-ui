// @ts-check
/*
 * Page definitions. Each page is a list of blocks; a block is Markdown
 * (rendered to HTML by ./markdown.mjs and used as-is for the .md twin) or a
 * pair of custom HTML and its Markdown equivalent (live examples, token
 * tables with samples, copy-paste markup).
 *
 * Links between pages are written as "site:<path>" and resolved per output:
 * relative in HTML, absolute in Markdown (see ./templates.mjs).
 */
import { specLabel } from "./css-comments.mjs";
import { COMPONENT_GROUPS, LEVELS } from "./discovery.mjs";
import { inline, plainText, shiftHeadings, tokenize } from "./markdown.mjs";
import { previewKind } from "./tokens.mjs";
import { BLOB_URL, REPO_URL, byString, escapeHtml, escapeMdCell, fence, firstSentence, mdCode, slugify } from "./util.mjs";

/**
 * @typedef {import("./discovery.mjs").Model} Model
 * @typedef {import("./discovery.mjs").Component} Component
 * @typedef {import("./discovery.mjs").Pattern} Pattern
 * @typedef {import("./discovery.mjs").Guide} Guide
 * @typedef {import("./discovery.mjs").Snippet} Snippet
 * @typedef {{ link: (target: string) => string, heading: (level: number, text: string) => string }} HtmlContext
 * @typedef {{ md: string, html?: (ctx: HtmlContext) => string }} Block
 * @typedef {"home" | "principles" | "tokens" | "base" | "layouts" | "atoms" | "molecules" | "organisms" | "patterns" | "guides" | "demos" | "contributing" | "changelog"} Section
 * @typedef {object} Page
 * @property {string} path         site path of the HTML page, e.g. "tokens/semantic.html"
 * @property {Section} section     where it is listed in the Docs sidebar (see ./nav.mjs)
 * @property {string} [navLabel]   sidebar link text, when not the title
 * @property {string} [navNote]    shown after the sidebar link in parentheses, e.g. "coming in M3"
 * @property {string} title        used in <title>, nav and llms.txt
 * @property {string} heading      the page's h1
 * @property {string} description  meta description and llms.txt note
 * @property {{ href: string, label: string }} source  footer link to the source
 * @property {Block[]} blocks
 * @property {Snippet[]} [snippets] copy-paste markup shown on the page, in order
 */

/** Where the component API convention is documented: the Getting started page. */
export const CONVENTION_LINK = "index.html#component-api";

/** Roadmap milestones that patterns are planned in. */
export const MILESTONES = /** @type {Record<string, string>} */ ({
  M3: "Molecules and navigation patterns",
  M3b: "App shell, complex layouts and organisms",
});

const md = (/** @type {string} */ text) => ({ md: text });
const edit = (/** @type {string} */ path) => ({ href: `${REPO_URL}/edit/main/${path}`, label: "Edit this page on GitHub" });
const plainMd = (/** @type {string} */ text) => plainText(text).replace(/\s+/g, " ").trim();

/** A bare URL in comment prose. */
const URL_IN_PROSE = /(https?:\/\/[^\s<>()"']+[^\s<>()"'.,;:])/;

/**
 * Comment prose to Markdown: bare URLs become autolinks, kept unescaped
 * (CommonMark does not process backslash escapes inside autolinks), and
 * elsewhere characters Markdown would read as emphasis, code or HTML are
 * kept literal ("use <small> for …").
 * @param {string} text
 */
const commentMd = (text) =>
  text
    .split(URL_IN_PROSE)
    .map((part, i) => (i % 2 ? `<${part}>` : part.replace(/([*_`[\]\\<])/g, "\\$1")))
    .join("");

/**
 * A repo-relative link target as a site page where one exists, else GitHub.
 * @param {string} href
 * @param {Model} model
 */
export function repoTarget(href, model) {
  const [path, hash = ""] = href.replace(/^\.\//, "").split(/(?=#)/);
  if (path.startsWith("examples/")) return `site:${path}${hash}`;
  if (path === "PRINCIPLES.md") {
    // GitHub's heading anchors keep the numbering ("#3-accessibility-…"); find the page it lives on.
    const anchor = hash.slice(1);
    for (const s of model.principles.sections) {
      if (githubSlug(s.heading) === anchor) return `site:${s.sitePath}`;
      const sub = tokenize(s.body).find((b) => b.type === "heading" && githubSlug(b.text) === anchor);
      if (sub && sub.type === "heading") return `site:${s.sitePath}#${slugify(sub.text)}`;
    }
    return "site:principles/index.html";
  }
  if (path === "CONTRIBUTING.md") return `site:contributing.html${hash}`;
  if (path === "CHANGELOG.md") return `site:changelog.html${hash}`;
  const tokenFile = model.tokenFiles.find((f) => f.path === path);
  if (tokenFile) return `site:${tokenFile.sitePath}${hash}`;
  if (path.startsWith("css/base/")) return "site:components/base.html";
  const hit = allComponents(model).find((c) => c.cssPath === path) ?? model.patterns.find((p) => p.cssPaths.includes(path));
  if (hit) return `site:${hit.sitePath}${hash}`;
  return `${BLOB_URL}${path}${hash}`;
}

/** GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens. @param {string} heading */
const githubSlug = (heading) =>
  plainText(heading)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s/g, "-");

/** Rewrite relative Markdown links with repoTarget(). @param {string} text @param {Model} model */
export const rewriteRepoLinks = (text, model) =>
  text.replace(/\]\(([^)\s]+)\)/g, (m, href) => (/^(?:[a-z]+:|#)/i.test(href) ? m : `](${repoTarget(href, model)})`));

/** Site link to a principle by slug, or the principles index. @param {Model} model @param {string} slug */
export const principleLink = (model, slug) =>
  model.principles.sections.find((s) => s.slug === slug)?.sitePath ?? "principles/index.html";

/**
 * A one-line description of a principle: the first sentence of its first
 * paragraph or list item, or, when it opens with a table, that table's
 * first column ("Class: .stack, .cluster, .grid.").
 * @param {string} body
 */
function firstSentenceOf(body) {
  for (const block of tokenize(body)) {
    if (block.type === "paragraph") return firstSentence(plainMd(block.text)).replace(/:$/, ".");
    if (block.type === "list") return firstSentence(plainMd(block.items[0].text)).replace(/:$/, ".");
    if (block.type === "table") {
      const [head, ...rows] = block.rows;
      return `${plainMd(head[0])}: ${rows.map((r) => plainMd(r[0])).join(", ")}.`;
    }
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* Shared Markdown, also used by README.md (see ./outputs.mjs).        */
/* ------------------------------------------------------------------ */

/** @param {Model} model */
export const installMd = (model) => `domestic-ui is plain CSS with no build step. Copy the \`css/\` folder into your project, or clone the repository:

\`\`\`sh
git clone ${REPO_URL}.git
\`\`\`

Link the single entry point. Plain semantic HTML then gets the full look; base elements need no classes.

\`\`\`html
<link rel="stylesheet" href="css/domestic.css">
\`\`\`

Its imports use relative paths, so it works from file paths and from subpaths. File paths under \`css/\` are public API; see [Agent-friendly by design](site:${principleLink(model, "agent-friendly-by-design")}).`;

/** @param {Model} model */
export const layersMd = (model) => `\`css/domestic.css\` declares the [cascade layers](site:${principleLink(model, "cascade-layers")}) once, lowest priority first. Later layers win regardless of selector specificity, and your own unlayered CSS beats all of them.

\`\`\`css
@layer ${model.layers.join(", ")};
\`\`\``;

/** @param {Model} model */
export const themingMd = (model) => `Override semantic \`--dui-*\` tokens on \`:root\`, or on an element with \`data-theme\` to scope a theme ([Theming](site:${principleLink(model, "theming")}), [theming example](site:examples/theming.html)).
Force a color scheme on the page or any subtree with \`data-color-scheme="light"\` or \`data-color-scheme="dark"\`.`;

const ATTRIBUTE_SELECTORS_URL = "https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors";
const REL_URL = "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel";

/** The layout primitive and utility classes, as code: `.cluster`, `.grid`, … @param {Model} model */
export const classApis = (model) => [...model.layouts, ...model.utilities].map((c) => `\`.${c.name}\``).join(", ");

/**
 * The one-line why of the component API convention: the group README's
 * Our choices bullet about `data-<…>`, after its first sentence.
 * @param {Model} model
 */
export function conventionWhy(model) {
  const bullet = Object.values(model.readmes).find((r) => r?.convention)?.convention ?? "";
  const text = bullet.replace(/^\*\*Our choice:\*\*\s*/, "");
  return text.slice(firstSentence(text).length).trim();
}

/** The component API convention, for the Getting started page and README.md. @param {Model} model */
export function conventionMd(model) {
  const why = conventionWhy(model);
  return `Each component exposes one \`data-<component>\` attribute. Its value is a list of space-separated words matched with the [\`~=\` attribute selector](${ATTRIBUTE_SELECTORS_URL}), like [\`rel\`](${REL_URL}): \`data-button="primary small"\`. Component APIs use no classes. State is carried by native attributes and ARIA: \`disabled\`, \`aria-disabled\`, \`aria-busy\`, \`aria-invalid\`.

${why ? `**Our choice:** ${why}\n\n` : ""}Layout primitives and utilities from M1 are classes: ${classApis(model)}. Base elements need no API: write semantic HTML.`;
}

/** The convention in one paragraph, for llms.txt. @param {Model} model */
export const conventionShortMd = (model) =>
  `Each component exposes one \`data-<component>\` attribute whose value is space-separated words matched with \`~=\`, such as \`data-button="primary small"\`, never classes; state is carried by native attributes and ARIA (\`disabled\`, \`aria-disabled\`, \`aria-busy\`, \`aria-invalid\`). Layout primitives and utilities are classes (${classApis(model)}), tuned with custom properties.`;

/**
 * The line next to a component's API: which data-* attribute follows the
 * convention, or that the API is native HTML and ARIA. Classes for layouts and utilities.
 * @param {Component} c
 */
function conventionNoteMd(c) {
  const link = `[component API convention](site:${CONVENTION_LINK})`;
  if (c.group === "layouts" || c.group === "utilities") return `Layout primitives and utilities are classes, not \`data-*\` attributes; see the ${link}.`;
  if (c.group === "base") return "";
  const attr = `${c.indexApi ?? ""}\n${c.api ?? ""}`.match(/\b(data-[a-z][\w-]*)/)?.[1];
  return attr
    ? `\`${attr}\` follows the ${link}: one attribute, its value space-separated words matched with \`~=\`; state is carried by native attributes and ARIA.`
    : `No \`data-*\` attribute: the API is native HTML and ARIA. See the ${link}.`;
}

/** One-line API summary: first word of each API line. @param {Component} c */
export function apiSummary(c) {
  const lines = c.api ? c.api.split("\n").map((l) => l.trim().split(/\s{2,}/)[0]).filter(Boolean) : [];
  return [...lines, ...c.apiInline];
}

/** Every component-like page, in docs order. @param {Model} model */
export const allComponents = (model) => [model.base, ...COMPONENT_GROUPS.flatMap(({ group }) => model.components[group]), ...model.layouts, ...model.utilities];

/** "Available" or "Coming in M3". @param {Pattern} p */
export const patternStatus = (p) => (p.available ? "Available" : `Coming in ${p.milestone}`);

/** Patterns in docs order: by milestone, then by title. @param {Model} model */
export const sortedPatterns = (model) => {
  const byTitle = [...model.patterns].sort((a, b) => byString(a.title, b.title));
  return Object.keys(MILESTONES)
    .flatMap((m) => byTitle.filter((p) => p.milestone === m))
    .concat(byTitle.filter((p) => !(p.milestone in MILESTONES)));
};

/** A spec as a Markdown link; its label may contain inline Markdown. @param {{ label: string, url: string }} s */
const specLink = (s) => `[${s.label}](${s.url})`;

/** What a pattern follows: its standards, or its Our choice line. @param {Pattern} p */
export const followsMd = (p) => (p.standards.length ? p.standards.map(specLink).join(", ") : `**Our choice:** ${p.ourChoice}`);

/** @param {Pattern} p */
const patternLine = (p) => `- [${p.title}](site:${p.sitePath}): ${p.summary} ${patternStatus(p)}.`;

/** "M3: Molecules and navigation patterns". @param {string} milestone */
const milestoneLabel = (milestone) => (MILESTONES[milestone] ? `${milestone}: ${MILESTONES[milestone]}` : milestone);

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

/** @param {Model} model @returns {Page[]} */
export function buildPages(model) {
  // In the order of the Docs sidebar (./nav.mjs), which lists each section's pages in this order.
  const as = (/** @type {Page} */ page, /** @type {Section} */ section) => ({ ...page, section });
  return [
    homePage(model),
    examplesPage(model),
    principlesIndex(model),
    ...model.principles.sections.map((s) => principlePage(model, s)),
    tokensIndex(model),
    ...model.tokenFiles.map((f) => tokenFilePage(model, f)),
    as(componentPage(model, model.base), "base"),
    ...model.utilities.map((c) => ({ ...as(componentPage(model, c), "base"), navNote: "utility" })),
    layoutsIndex(model),
    ...model.layouts.map((c) => as(componentPage(model, c), "layouts")),
    ...COMPONENT_GROUPS.flatMap(({ group }) => [levelIndex(model, group), ...model.components[group].map((c) => as(componentPage(model, c), /** @type {Section} */ (group)))]),
    patternsIndex(model),
    ...sortedPatterns(model).map((p) => patternPage(model, p)),
    guidesIndex(model),
    ...model.guides.map((g) => guidePage(model, g)),
    demosPage(model),
    repoFilePage(model, "CONTRIBUTING.md", model.contributing, "contributing"),
    repoFilePage(model, "CHANGELOG.md", model.changelog, "changelog"),
  ];
}

/** @param {Model} model @returns {Page} */
function homePage(model) {
  return {
    path: "index.html",
    section: "home",
    title: "Getting started",
    heading: "domestic-ui",
    description: firstSentence(plainMd(model.intro)),
    source: edit("site/content/readme-intro.md"),
    blocks: [
      md(model.intro),
      md(`## Install and use\n\n${installMd(model)}`),
      md(`## Layer order\n\n${layersMd(model)}`),
      md(`## Theming\n\n${themingMd(model)}`),
      md(`## Component API\n\n${conventionMd(model)}`),
      md(`## What is in these docs

The Docs menu lists every page. In order:

${docsMapMd(model)}`),
      md(`## For coding agents

- [llms.txt](site:llms.txt): an index of these docs in the [llms.txt](https://llmstxt.org/) format.
- [llms-full.txt](site:llms-full.txt): every page in one Markdown file.
- Every docs page has a Markdown twin at the same path with \`.md\` instead of \`.html\`.`),
    ],
  };
}

/** One line per sidebar entry after Getting started. @param {Model} model */
const docsMapMd = (model) => {
  const tokens = model.tokenFiles.map((f) => f.groups.reduce((n, g) => n + g.tokens.length, 0)).reduce((a, b) => a + b, 0);
  const available = model.patterns.filter((p) => p.available).length;
  return [
    `- [Principles](site:principles/index.html): ${model.principles.sections.length} sections, one page each.`,
    `- [Tokens](site:tokens/index.html): all ${tokens} custom properties with their light and dark values.`,
    `- [Base](site:${model.base.sitePath}): native elements styled with no classes, and the ${model.utilities.map((u) => `\`.${u.name}\``).join(", ")} utility.`,
    `- [Layout](site:layouts/index.html): the layout primitives ${model.layouts.map((l) => `\`.${l.name}\``).join(", ")}.`,
    ...COMPONENT_GROUPS.map(({ group, title, milestone }) => {
      const n = model.components[group].length;
      return `- [${title}](site:${group}/index.html): ${n ? `${n} component${n === 1 ? "" : "s"}.` : `coming in ${milestone}.`}`;
    }),
    `- [Patterns and guides](site:patterns/index.html): ${model.patterns.length} patterns (${available} available) and ${model.guides.length} guide${model.guides.length === 1 ? "" : "s"}.`,
    `- [Demos](site:demos.html): ${model.demos.length ? `${model.demos.length} demo directories in \`demos/\`, on GitHub.` : "coming in M5."}`,
    "- [Contributing](site:contributing.html) and [Changelog](site:changelog.html).",
  ].join("\n");
};

/** @param {Model} model */
const principleListMd = (model) => model.principles.sections.map((s, i) => `${i + 1}. [${s.title}](site:${s.sitePath})`).join("\n");

/** Token pages with their counts and groups. @param {Model} model */
const tokenListMd = (model) =>
  model.tokenFiles
    .map((f) => {
      const n = f.groups.reduce((sum, g) => sum + g.tokens.length, 0);
      return `- [${f.title}](site:${f.sitePath})${f.tier ? ` (${f.tier})` : ""}: ${n} token${n === 1 ? "" : "s"} in ${f.groups.map((g) => g.name.toLowerCase()).join(", ")}.`;
    })
    .join("\n");

/** @param {Component} c */
const componentLine = (c) => `- [${c.title}](site:${c.sitePath}): ${commentMd(c.summary)}`;

/**
 * A component group's README sections: every Our choices bullet, labels kept,
 * and the Not shipped table.
 * @param {Model} model
 * @param {string} group
 * @param {number} level heading level
 */
function groupDetailsMd(model, group, level) {
  const readme = model.readmes[group];
  if (!readme) return "";
  const h = "#".repeat(level);
  const src = `[\`${readme.path}\`](${BLOB_URL}${readme.path})`;
  const out = [];
  if (readme.choices.length) out.push(`${h} Our choices\n\nFrom ${src}. Each is a choice between valid options, not a standard.\n\n${readme.choices.map((c) => `- ${rewriteRepoLinks(c, model)}`).join("\n")}`);
  if (readme.notShipped) out.push(`${h} Not shipped, and why\n\n${rewriteRepoLinks(readme.notShipped, model)}`);
  return out.join("\n\n");
}

/** Demo apps on GitHub: name, link, and the first sentence of the README. @param {Model} model */
export const demoListMd = (model) =>
  model.demos.length
    ? model.demos.map((d) => `- **${d.title}** ([\`${d.path}\`](${REPO_URL}/tree/main/${d.path.replace(/\/$/, "")})): ${rewriteRepoLinks(d.description.replace(/\s*\n\s*/g, " "), model)}`).join("\n")
    : "Coming in M5.";

/**
 * What exists or is planned at one level: its components (tokens: token
 * groups; atoms: base elements first), then the registered patterns at that
 * level with their status. When a component group has neither components
 * nor patterns, one honest sentence says when it lands.
 * @param {Model} model
 * @param {string} level
 */
export function levelMd(model, level) {
  const patterns = sortedPatterns(model).filter((p) => p.level === level);
  /** @type {string[]} */
  let items = [];
  if (level === "tokens") items = tokenListMd(model).split("\n");
  else if (level === "layouts") items = model.layouts.map(componentLine);
  else items = [...(level === "atoms" ? [componentLine(model.base)] : []), ...(model.components[level] ?? []).map(componentLine)];
  const lines = [...items, ...patterns.map(patternLine)].join("\n");
  const group = COMPONENT_GROUPS.find((g) => g.group === level);
  const empty = group && !model.components[level].length && !patterns.length;
  const note = empty ? `Components in \`css/components/${level}/\`: coming in ${group.milestone}; see the [components README](${BLOB_URL}css/components/README.md).` : "";
  return [lines, note].filter(Boolean).join("\n\n");
}

/** @param {Model} model */
const guideListMd = (model) => model.guides.map((g) => `- [${g.title}](site:${g.sitePath}): ${g.summary}`).join("\n") || "No guides yet.";

const patternIntroMd = `Where a standard exists, a native HTML element or a [WAI-ARIA APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/), the pattern follows it and links to it. Where none exists, the pattern is written as close to plain HTML as possible and labeled **Our choice:** with one line on why.`;

/** @param {Model} model @returns {Page} */
function principlesIndex(model) {
  return {
    path: "principles/index.html",
    section: "principles",
    title: "Principles",
    heading: "Principles",
    description: firstSentence(plainMd(model.principles.intro)),
    source: edit("PRINCIPLES.md"),
    blocks: [md(rewriteRepoLinks(model.principles.intro, model)), md(`## Sections\n\n${principleListMd(model)}`)],
  };
}

/**
 * @param {Model} model
 * @param {Model["principles"]["sections"][number]} s
 * @returns {Page}
 */
function principlePage(model, s) {
  return {
    path: s.sitePath,
    section: "principles",
    title: s.title,
    heading: s.title,
    description: firstSentenceOf(s.body) || s.title,
    source: edit("PRINCIPLES.md"),
    blocks: [md(shiftHeadings(rewriteRepoLinks(s.body, model), -1))],
  };
}

/**
 * The tier table from PRINCIPLES.md ("| Tier | File | … |"), as written,
 * or "" when it has none.
 * @param {Model} model
 */
function tierTableMd(model) {
  for (const s of model.principles.sections) {
    const table = tokenize(s.body).find((b) => b.type === "table" && /^tier$/i.test(b.rows[0][0]));
    if (table) return `From [${s.title}](site:${s.sitePath}) in \`PRINCIPLES.md\`:\n\n${rewriteRepoLinks(table.raw, model)}`;
  }
  return "";
}

const RESOLVED_MD = `**Written as** is the value in the file. **Light** and **dark** follow every \`var()\` through all token files and take one side of [\`light-dark()\`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark); functions such as \`color-mix()\` and \`clamp()\` are left for the browser. Overrides under a condition, such as \`@media (prefers-reduced-motion: reduce)\`, are listed in the description. Previews are decorative; the text in each row is the reference.`;

/** @param {Model} model @returns {Page} */
function tokensIndex(model) {
  const all = model.tokenFiles.flatMap((f) => f.groups.flatMap((g) => g.tokens));
  return {
    path: "tokens/index.html",
    section: "tokens",
    title: "Tokens",
    heading: "Tokens",
    description: `The two tiers of domestic-ui design tokens: ${all.length} custom properties with their light and dark values.`,
    source: { href: `${REPO_URL}/tree/main/css/tokens`, label: "Browse css/tokens/ on GitHub" },
    blocks: [
      md(`All tokens are [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) on \`:root\` with the \`--dui-\` prefix, in two tiers:

- **Primitive** tokens are named by what they are, such as \`--dui-color-blue-600\`. They are internal and may change in any release.
- **Semantic** tokens are named by what they are for, such as \`--dui-color-accent\`. They are the public theming API: renaming or removing one is a breaking change.

Base, layout, utility and component CSS use only semantic tokens; \`npm run lint:tokens\` enforces this. To theme, override semantic tokens: see [Theming](site:${principleLink(model, "theming")}) and the [theming example](site:examples/theming.html).`),
      md(`## Token files\n\nOne page per file in \`css/tokens/\`, grouped by its section comments, with a filter.\n\n${tokenListMd(model)}`),
      ...(tierTableMd(model) ? [md(`## Tiers\n\n${tierTableMd(model)}`)] : []),
      md(`## How values are shown\n\n${RESOLVED_MD}`),
    ],
  };
}

/** @typedef {Model["tokenFiles"][number]} TokenFile @typedef {TokenFile["groups"][number]["tokens"][number]} Token */

/** A token's description: its comment, else its purpose in PRINCIPLES.md, else "". @param {Token} t */
const tokenDescription = (t) => (t.description ? { text: t.description, from: "comment" } : t.purpose ? { text: t.purpose, from: "PRINCIPLES.md" } : { text: "", from: "" });

/** Conditional overrides, as one line each. @param {Token} t @param {boolean} html */
const conditionLines = (t, html) =>
  t.conditions.map((c) => {
    const code = (/** @type {string} */ s) => (html ? `<code>${escapeHtml(s)}</code>` : mdCode(s));
    const resolved = c.light === c.dark ? (c.light === c.value ? "" : `, resolves to ${code(c.light)}`) : `, resolves to ${code(c.light)} (light), ${code(c.dark)} (dark)`;
    return `With ${code(c.condition)}: ${code(c.value)}${resolved}.`;
  });

/**
 * A decorative preview of one value. Values are literal (resolved), never
 * var(), so the dark preview shows the dark value whatever the page scheme.
 * @param {string} kind from previewKind()
 * @param {string} value
 */
function previewHtml(kind, value) {
  // A quoted family name made of plain words is the same unquoted ("Cascadia Code" → Cascadia Code).
  const css = kind === "font-family" ? value.replace(/"([A-Za-z][\w -]*)"/g, "$1") : value;
  // A value that would need HTML escaping in the style attribute gets no preview (see previewable()).
  if (kind === "text" || !previewable(css)) return "";
  const style = `--preview: ${css}`;
  if (kind === "color") return `<span class="token-chip" style="${style}"></span>`;
  const text = /^font|line-height|letter-spacing/.test(kind) ? "Aa Bb Cc" : "";
  return `<span class="token-preview" data-preview="${kind}" style="${style}">${text}</span>`;
}

/**
 * A value as code that wraps only at spaces: words with a hyphen
 * (var(--dui-space-3)) are kept whole, so a narrow table scrolls in its
 * region instead of breaking names apart.
 * @param {string} value
 */
const valueCode = (value) =>
  `<code>${value
    .split(" ")
    .map((w) => (w.includes("-") ? `<span class="token-word">${escapeHtml(w)}</span>` : escapeHtml(w)))
    .join(" ")}</code>`;

/**
 * True when a value can go into style="--preview: …" as-is: no character
 * that needs an HTML entity, and no ";" (html-validate's no-inline-style
 * splits declarations on ";", entities included).
 * @param {string} value
 */
const previewable = (value) => !/[&<>"';]/.test(value);

/** The preview cell: one sample, or light and dark side by side when they differ. Each with its value. @param {Token} t */
function previewCell(t) {
  const shown = previewKind(t);
  const kind = previewable(shown === "font-family" ? t.light.replace(/"([A-Za-z][\w -]*)"/g, "$1") : t.light) ? shown : "text";
  if (kind === "text") return `<span class="token-text-only">${t.light === t.dark ? "" : "Light: "}${valueCode(t.light)}${t.light === t.dark ? "" : `; dark: ${valueCode(t.dark)}`}</span>`;
  const one = (/** @type {"light" | "dark"} */ scheme, /** @type {string} */ label) => {
    const value = t[scheme];
    return `<span class="token-sample" data-color-scheme="${scheme}"><span aria-hidden="true">${previewHtml(kind, value)}</span><span>${label}${valueCode(value)}</span></span>`;
  };
  return t.light === t.dark && kind !== "color" ? one("light", "") : `${one("light", "Light: ")}${one("dark", "Dark: ")}`;
}

/**
 * The page of one token file: intro, filter, then one table per group.
 * @param {Model} model
 * @param {TokenFile} f
 * @returns {Page}
 */
function tokenFilePage(model, f) {
  const count = f.groups.reduce((n, g) => n + g.tokens.length, 0);
  const fileLink = `[\`${f.path}\`](${BLOB_URL}${f.path})`;
  // Token file comments write code in backticks, so keep those as code spans.
  const prose = (/** @type {string} */ text) => text.split(/(`[^`]+`)/).map((part, i) => (i % 2 ? part : commentMd(part))).join("");
  const intro = [f.tier ? `**${f.tier.charAt(0).toUpperCase()}${f.tier.slice(1)}.** ` : "", f.intro.split("\n\n").map(prose).join("\n\n")].join("");
  const short = f.title.toLowerCase();

  /** @type {Block} */
  const filter = {
    md: "",
    html: () => `<search class="token-filter" data-token-filter hidden>
<label for="token-filter">Filter tokens</label>
<input type="search" id="token-filter" autocomplete="off" spellcheck="false" aria-describedby="token-filter-hint">
<p id="token-filter-hint" data-text="small">Matches names, values and descriptions.</p>
</search>
<p class="token-filter-status" role="status" data-token-filter-status></p>`,
  };

  const groupBlock = (/** @type {TokenFile["groups"][number]} */ g) => {
    const caption = `${g.name} (${short})`;
    const note = g.note ? `${commentMd(g.note.charAt(0).toUpperCase() + g.note.slice(1)).replace(/([^.])$/, "$1.")}` : "";
    const descMd = (/** @type {Token} */ t) => {
      const d = tokenDescription(t);
      return [d.text ? `${d.text}${d.from === "PRINCIPLES.md" ? " (from PRINCIPLES.md)" : ""}` : "No description yet.", ...conditionLines(t, false)].join(" ");
    };
    const tableMd = [
      "| Token | Light | Dark | Description |",
      "| --- | --- | --- | --- |",
      ...g.tokens.map((t) => `| ${[mdCode(t.name), mdCode(t.light), mdCode(t.dark), descMd(t)].map(escapeMdCell).join(" | ")} |`),
    ].join("\n");
    return {
      md: `## ${g.name}\n\n${note ? `${note}\n\n` : ""}${tableMd}`,
      html: (/** @type {HtmlContext} */ ctx) => {
        const rows = g.tokens.map((t) => {
          const d = tokenDescription(t);
          const text = d.text
            ? `${d.from === "comment" ? inline(commentMd(d.text)) : inline(d.text)}${d.from === "PRINCIPLES.md" ? ' <span data-text="muted">(from PRINCIPLES.md)</span>' : ""}`
            : '<span class="token-missing">No description yet</span>';
          const conditions = conditionLines(t, true).map((l) => `<br>${l}`).join("");
          return `<tr><th scope="row"><code>${escapeHtml(t.name)}</code></th><td>${valueCode(t.value)}</td><td>${valueCode(t.light)}</td><td>${valueCode(t.dark)}</td><td>${text}${conditions}</td><td>${previewCell(t)}</td></tr>`;
        });
        const head = ["Token", "Written as", "Light", "Dark", "Description", "Preview"].map((h) => `<th scope="col">${h}</th>`).join("");
        return `<div class="token-group" data-token-group>
${ctx.heading(2, g.name)}
${note ? `<p>${inline(note)}</p>\n` : ""}<!-- [html-validate-disable-next prefer-native-element: the data-scroll="inline" API is a div with role="region"] -->
<div data-scroll="inline" tabindex="0" role="region" aria-label="${escapeHtml(caption)} (scrolls horizontally)">
<table class="token-table">
<caption>${escapeHtml(caption)}</caption>
<thead>
<tr>${head}</tr>
</thead>
<tbody>
${rows.join("\n")}
</tbody>
</table>
</div>
</div>`;
      },
    };
  };

  return {
    path: f.sitePath,
    section: "tokens",
    title: f.title,
    heading: f.title,
    description: `All ${count} ${short} in ${f.path}${f.tier ? ` (${f.tier})` : ""}, with resolved light and dark values.`,
    source: edit(f.path),
    blocks: [
      md(`${intro}\n\nDefined in ${fileLink}: ${count} tokens in ${f.groups.length} groups, one per section comment. See [Tokens](site:tokens/index.html) for the two tiers.\n\n${RESOLVED_MD}`),
      filter,
      ...f.groups.map(groupBlock),
    ],
  };
}

/** The "Coming in M3" note shown after a planned pattern's sidebar link. @param {Pattern} p */
const patternNavNote = (p) => (p.available ? "" : `coming in ${p.milestone}`);

/**
 * The index page of one component level (Atoms, Molecules, Organisms):
 * its components, the patterns planned at that level, and the group
 * README's choices.
 * @param {Model} model
 * @param {string} group
 * @returns {Page}
 */
function levelIndex(model, group) {
  const { title } = /** @type {(typeof COMPONENT_GROUPS)[number]} */ (COMPONENT_GROUPS.find((g) => g.group === group));
  const readme = model.readmes[group];
  const apiLine = (/** @type {Component} */ c) => (c.indexApi ? ` API: ${c.indexApi}.` : "");
  const items = model.components[group].map((c) => `${componentLine(c)}${apiLine(c)}`);
  const patterns = sortedPatterns(model).filter((p) => p.level === group).map(patternLine);
  const empty = !items.length && !patterns.length;
  const milestone = COMPONENT_GROUPS.find((g) => g.group === group)?.milestone;
  /** @type {Block[]} */
  const blocks = [
    md(
      `${group === "atoms" ? `Atoms add the minimum on top of the [base layer](site:${model.base.sitePath}): plain HTML already looks right, and an atom covers what a native element cannot say on its own. ` : ""}Components use one \`data-<component>\` attribute each; see the [component API convention](site:${CONVENTION_LINK}). The levels follow [atomic design](https://atomicdesign.bradfrost.com/chapter-2/); planned [patterns](site:patterns/index.html) are listed at their level with their status.`,
    ),
  ];
  blocks.push(md(`## ${title}\n\n${[...items, ...patterns].join("\n") || `Coming in ${milestone}; see the [components README](${BLOB_URL}css/components/README.md).`}`));
  const details = groupDetailsMd(model, group, 2);
  if (details) blocks.push(md(details));
  return {
    path: `${group}/index.html`,
    section: /** @type {Section} */ (group),
    title,
    heading: title,
    description: empty ? `${title} of domestic-ui: coming in ${milestone}.` : `Every ${title.toLowerCase().replace(/s$/, "")} in domestic-ui${patterns.length ? ", with the patterns planned at this level" : ""}.`,
    source: readme ? edit(readme.path) : edit("css/components/README.md"),
    blocks,
  };
}

/** @param {Model} model @returns {Page} */
function layoutsIndex(model) {
  return {
    path: "layouts/index.html",
    section: "layouts",
    title: "Layouts",
    heading: "Layouts",
    description: "Layout primitives and planned page layouts of domestic-ui.",
    source: edit(model.layouts[0]?.cssPath ?? "PRINCIPLES.md"),
    blocks: [
      md(`Layout primitives arrange their children and nothing else; see [Layout primitives](site:${principleLink(model, "layout-primitives")}). Each has one class and is tuned with custom properties. Page layouts such as the app shell are listed with their status.`),
      md(`## All layouts\n\n${levelMd(model, "layouts")}`),
    ],
  };
}

/**
 * The "Our choice" line, for things no native element or APG pattern covers.
 * @param {string} why Markdown
 */
const ourChoiceMd = (why) => `**Our choice:** ${why}`;

/**
 * Copy-paste markup blocks: an intro naming the source, then one code block
 * per snippet (HTML: <pre data-snippet>; Markdown: a long-enough fence).
 * @param {Snippet[]} snippets
 * @returns {Block[]}
 */
function markupBlocks(snippets) {
  const n = snippets.length;
  const first = snippets[0];
  const sources = [...new Set(snippets.map((s) => s.source))].map((s) => `[\`${s}\`](${BLOB_URL}${s})`).join(" and ");
  const intro =
    first.from === "css-comment"
      ? `From the \`Example\` block in ${sources}:`
      : first.from === "pre"
        ? `The \`<pre><code>\` blocks in ${sources}, HTML-unescaped and otherwise unchanged, each named by the heading of its section:`
        : first.from === "main" && n === 1
        ? `The content of \`<main>\` in ${sources}, unchanged except for removing the common indentation:`
        : `From ${sources}, unchanged except for removing the common indentation:`;
  return [
    md(`## Markup\n\n${intro}`),
    ...snippets.map((s, i) => {
      const name = snippetName(s, i, n);
      return {
        md: `${name ? `### ${name}\n\n` : ""}${fence(s.code, "html")}`,
        html: (/** @type {HtmlContext} */ ctx) => `${name ? `${ctx.heading(3, name)}\n` : ""}<pre data-snippet="${escapeHtml(s.source)}"><code>${escapeHtml(s.code)}</code></pre>`,
      };
    }),
  ];
}

/**
 * Live example blocks: one framed example page per path.
 * @param {Model} model
 * @param {string[]} paths
 * @param {string} title
 * @returns {Block}
 */
function liveExampleBlock(model, paths, title) {
  const name = (/** @type {string} */ p) => (paths.length > 1 ? (model.examples.find((e) => e.path === p)?.title ?? p) : title);
  return {
    md: `## Live example\n\n${paths.map((p) => `- [Open ${paths.length > 1 ? name(p) : "the example"} on its own](site:${p})`).join("\n")}`,
    html: (ctx) =>
      [
        ctx.heading(2, "Live example"),
        ...paths.map(
          (p) =>
            `<iframe class="example-frame" src="${escapeHtml(ctx.link(p))}" title="Live example: ${escapeHtml(name(p))}" loading="lazy"></iframe>\n<p><a href="${escapeHtml(ctx.link(p))}">Open ${escapeHtml(paths.length > 1 ? name(p) : "the example")} on its own</a></p>`,
        ),
      ].join("\n"),
  };
}

/** Name for a snippet heading and aria label. @param {Snippet} s @param {number} i @param {number} n */
const snippetName = (s, i, n) => s.name || (n > 1 ? `Snippet ${i + 1}` : "");

/**
 * @param {Model} model
 * @param {Component} c
 * @returns {Page}
 */
function componentPage(model, c) {
  /** @type {Block[]} */
  const blocks = [md(commentMd(c.summary))];
  if (c.ourChoice) blocks.push(md(ourChoiceMd(c.ourChoice)));

  // API: the index row's cell as written, then the CSS header's API block.
  const api = [];
  const cssLink = `[\`${c.cssPath}\`](${BLOB_URL}${c.cssPath})`;
  if (c.indexApi && c.indexPath) api.push(`From the index in [\`${c.indexPath}\`](${BLOB_URL}${c.indexPath}):\n\n${c.indexApi}`);
  if (c.api) api.push(`${c.indexApi ? `The \`API\` block in ${cssLink}:\n\n` : ""}${fence(c.api, "text")}`);
  for (const line of c.apiInline) api.push(`- ${mdCode(line)}`);
  if (c.group === "base") api.unshift("No classes: write semantic HTML and the base layer styles it.");
  if (!api.length) api.push("The CSS header comment does not have an `API` block yet.");
  const convention = conventionNoteMd(c);
  if (convention) api.push(convention);
  blocks.push(md(`## API\n\n${api.join("\n\n")}`));

  // Labelled blocks of the header comment (States, Sizes, Focus, …), verbatim.
  for (const b of c.blocks) blocks.push(md(`## ${b.label}\n\nFrom the \`${b.label}\` block in ${cssLink}:\n\n${fence(b.text, "text")}`));

  if (c.keyboard.length) {
    const rows = c.keyboard.map((k) => `| ${escapeMdCell(kbdMd(k.key, false))} | ${escapeMdCell(commentMd(k.action))} |`);
    blocks.push(md(`## Keyboard\n\nFrom the \`Keyboard\` block in ${cssLink}.\n\n| Key | Action |\n| --- | --- |\n${rows.join("\n")}`));
  }

  if (c.choices.length && c.indexPath) {
    blocks.push(md(`## Our choice\n\nFrom [\`${c.indexPath}\`](${BLOB_URL}${c.indexPath}). Each is a choice between valid options, not a standard.\n\n${c.choices.map((x) => `- ${rewriteRepoLinks(x, model)}`).join("\n")}`));
  }

  if (c.files.length) {
    const rows = c.files.map((f) => `| [${mdCode(f.path)}](${BLOB_URL}${f.path}) | ${escapeMdCell(commentMd(f.summary))} |`);
    blocks.push(md(`## Files in css/base/\n\n| File | Covers |\n| --- | --- |\n${rows.join("\n")}`));
  }

  // Live example
  if (c.examplePath) {
    blocks.push(liveExampleBlock(model, [c.examplePath], c.title));
  } else {
    const used = c.usedIn.map((p) => `[${model.examples.find((e) => e.path === p)?.title ?? p}](site:${p})`);
    const usedMd = used.length ? ` These example pages use it: ${used.join(", ")}.` : "";
    blocks.push(md(`## Live example\n\nThere is no standalone example page for ${c.title.toLowerCase()} yet.${usedMd}`));
  }

  // Copy-paste markup
  if (c.snippets.length) {
    blocks.push(...markupBlocks(c.snippets));
  } else {
    blocks.push(md("## Markup\n\nNo markup snippet yet: there is no example page and no `Example` block in the CSS header comment."));
  }

  if (c.notes.length) blocks.push(md(`## Notes\n\n${c.notes.map(commentMd).join("\n\n")}`));

  const baseline = `[Accessibility baseline](site:${principleLink(model, "accessibility-baseline-wcag-22-aa")})`;
  const a11y = !c.ownCss
    ? `There is no CSS file of its own: ${cssLink} styles these elements in the base layer. See [Base elements](site:${model.base.sitePath}) for their accessibility notes, the spec links below and the ${baseline} principle.`
    : c.a11y
    ? c.a11yFromOverride
      ? rewriteRepoLinks(c.a11y, model)
      : `From the CSS header comment: ${commentMd(c.a11y)}\n\nSee also the spec links below and the ${baseline} principle.`
    : `The CSS header comment has no accessibility notes. See the spec links below and the ${baseline} principle.`;
  const labelled = c.blocks.length ? `\n\nThe header comment's ${c.blocks.map((b) => `\`${b.label}\``).join(", ")} ${c.blocks.length === 1 ? "block is" : "blocks are"} shown above under ${c.blocks.length === 1 ? "its own heading" : "their own headings"}.` : "";
  blocks.push(md(`## Accessibility\n\n${a11y}${labelled}`));

  const specs = c.specs.length
    ? c.specs.map((s) => `- **${escapeMdCell(s.label)}**: [${s.url.replace(/^https?:\/\//, "")}](${s.url})`).join("\n")
    : "The CSS header comment links no specs.";
  blocks.push(md(`## Specs\n\n${specs}`));

  const sources = [c.group === "base" ? `[\`css/base/\`](${REPO_URL}/tree/main/css/base)` : `${cssLink}${c.ownCss ? "" : " (base layer; no CSS file of its own)"}`];
  if (c.examplePath) sources.push(`[\`${c.examplePath}\`](${BLOB_URL}${c.examplePath})`);
  if (c.indexPath) sources.push(`[\`${c.indexPath}\`](${BLOB_URL}${c.indexPath})`);
  if (c.overridePath) sources.push(`[\`${c.overridePath}\`](${BLOB_URL}${c.overridePath})`);
  blocks.push(md(`## Source\n\n${sources.map((s) => `- ${s}`).join("\n")}`));

  return {
    path: c.sitePath,
    section: "atoms", // set by buildPages()
    title: c.title,
    heading: c.title,
    description: plainMd(commentMd(c.summary)),
    source: edit(c.overridePath ?? (c.group === "base" ? (c.files[0]?.path ?? "css/base/document.css") : c.ownCss ? c.cssPath : (c.indexPath ?? c.cssPath))),
    blocks,
    snippets: c.snippets,
  };
}

/** @param {Model} model @returns {Page} */
function examplesPage(model) {
  const groups = [...new Set(model.examples.map((e) => e.group))];
  const titles = /** @type {Record<string, string>} */ ({ layout: "Layouts", layouts: "Layouts", patterns: "Patterns" });
  const sections = groups.map((g) => {
    // A group's showcase (index.html) first, then its pages.
    const inGroup = model.examples.filter((e) => e.group === g);
    const ordered = [...inGroup.filter((e) => e.showcase), ...inGroup.filter((e) => !e.showcase)];
    const items = ordered.map((e) => `- [${e.title}](site:${e.path}) ([source](${BLOB_URL}${e.path}))`);
    const title = g ? (COMPONENT_GROUPS.find((x) => x.group === g)?.title ?? titles[g] ?? g) : "Pages";
    return `## ${title} (\`examples/${g ? `${g}/` : ""}\`)\n\n${items.join("\n")}`;
  });
  return {
    path: "examples.html",
    section: "home",
    navLabel: "All example pages",
    title: "Examples",
    heading: "Examples",
    description: "Standalone example pages that load the real domestic-ui CSS.",
    source: { href: `${REPO_URL}/tree/main/examples`, label: "Browse the examples source on GitHub" },
    blocks: [md("Standalone HTML pages that load `css/domestic.css`, nothing else. Open one, or read its source on GitHub."), ...sections.map(md)],
  };
}

/** @param {Model} model @returns {Page} */
function demosPage(model) {
  const intro = model.demosIntro ? `${rewriteRepoLinks(model.demosIntro, model)}\n\n` : "";
  return {
    path: "demos.html",
    section: "demos",
    title: "Demos",
    heading: "Demos",
    description: model.demos.length ? "Demo apps in demos/ that use domestic-ui, each with a link to its source on GitHub." : "Demo apps: coming in M5.",
    source: { href: `${REPO_URL}/tree/main/demos`, label: "Browse demos/ on GitHub" },
    blocks: [
      md(
        model.demos.length
          ? `${intro}Each directory in [\`demos/\`](${REPO_URL}/tree/main/demos) with a \`README.md\`, by name, with the first sentence of that README. Demos are not part of this site; follow the link to read the source and how to run it.\n\n${demoListMd(model)}`
          : "Coming in M5.",
      ),
    ],
  };
}

/**
 * A repository Markdown file rendered read-only: its H1 is the page
 * heading, relative links go to the matching site page or GitHub.
 * @param {Model} model
 * @param {string} file "CONTRIBUTING.md"
 * @param {string} text the file's content, "" when missing
 * @param {"contributing" | "changelog"} section
 * @returns {Page}
 */
function repoFilePage(model, file, text, section) {
  const title = section === "contributing" ? "Contributing" : "Changelog";
  const h1 = text.match(/^#\s+(.+)$/m)?.[1].trim() ?? title;
  const body = text.replace(/^#\s+.+\n+/m, "").trim();
  const note = `Rendered read-only from [\`${file}\`](${BLOB_URL}${file}). To change it, [edit ${file} on GitHub](${REPO_URL}/edit/main/${file}).`;
  return {
    path: `${section}.html`,
    section,
    title,
    heading: h1,
    description: body ? firstSentence(plainMd(tokenize(body).find((b) => b.type === "paragraph")?.text ?? title)) : `${file} is not written yet.`,
    source: edit(file),
    blocks: [md(note), md(body ? rewriteRepoLinks(body, model) : `There is no \`${file}\` yet.`)],
  };
}

/** @param {Model} model @returns {Page} */
function patternsIndex(model) {
  const row = (/** @type {Pattern} */ p) => {
    const level = LEVELS.find((l) => l.level === p.level)?.singular ?? p.level;
    return `| [${p.title}](site:${p.sitePath}) | ${level} | ${patternStatus(p)} | ${escapeMdCell(followsMd(p))} |`;
  };
  const milestones = [...new Set(sortedPatterns(model).map((p) => p.milestone))];
  const guide = model.guides[0];
  const guideMd = guide ? ` To go from a plain page to a full app step by step, read [${guide.title}](site:${guide.sitePath}).` : "";
  return {
    path: "patterns/index.html",
    section: "patterns",
    title: "Patterns",
    heading: "Patterns",
    description: "Planned and available interface patterns, from site navigation to app shells, with the standard each one follows.",
    source: { href: `${REPO_URL}/tree/main/site/content/patterns`, label: "Browse the pattern registry on GitHub" },
    blocks: [
      md(`${patternIntroMd}\n\nA pattern page fills in on its own when its example page or CSS file lands. Until then it says which milestone it is planned for.${guideMd}`),
      ...milestones.map((m) => {
        const rows = sortedPatterns(model).filter((p) => p.milestone === m).map(row);
        return md(`## ${milestoneLabel(m)}\n\n| Pattern | Level | Status | Follows |\n| --- | --- | --- | --- |\n${rows.join("\n")}`);
      }),
    ],
  };
}

/** Keys as <kbd>, one per alternative ("Left Arrow / Right Arrow"). @param {string} key @param {boolean} markdown */
const kbdMd = (key, markdown) =>
  key
    .split(/\s+\/\s+/)
    .map((k) => `<kbd>${markdown ? k : commentMd(k)}</kbd>`)
    .join(" / ");

/**
 * Keyboard notes: the Keyboard block of the example page or CSS header,
 * else the registry's list, else one line pointing at the standard.
 * @param {Model} model
 * @param {Pattern} p
 * @returns {Block}
 */
function keyboardBlock(model, p) {
  if (p.keyboard.length) {
    const markdown = p.keyboardFrom === "front matter";
    const src = `[\`${p.keyboardSource}\`](${BLOB_URL}${p.keyboardSource})`;
    const intro = markdown ? `From the pattern registry, ${src}; the example page and CSS have no \`Keyboard\` block yet.` : `From the \`Keyboard\` block in ${src}.`;
    const rows = p.keyboard.map((k) => `| ${escapeMdCell(kbdMd(k.key, markdown))} | ${escapeMdCell(markdown ? k.action : commentMd(k.action))} |`);
    return md(`## Keyboard\n\n${intro}\n\n| Key | Action |\n| --- | --- |\n${rows.join("\n")}`);
  }
  const apg = p.standards.find((s) => s.url.startsWith("https://www.w3.org/WAI/ARIA/apg/"));
  if (apg) return md(`## Keyboard\n\nNo keyboard notes yet. Follow the keyboard interaction section of the ${specLink(apg)}.`);
  if (p.standards.length) return md(`## Keyboard\n\nNo keyboard notes yet. Native elements keep their built-in keyboard behavior; see ${specLink(p.standards[0])}.`);
  return md(`## Keyboard\n\nNo keyboard notes yet. See the [Accessibility baseline](site:${principleLink(model, "accessibility-baseline-wcag-22-aa")}) principle.`);
}

/**
 * A pattern page. Until an example page or CSS file exists it shows only
 * the summary, the standard (or Our choice line) and when it is planned.
 * @param {Model} model
 * @param {Pattern} p
 * @returns {Page}
 */
function patternPage(model, p) {
  const level = LEVELS.find((l) => l.level === p.level)?.singular ?? p.level;
  const standard = p.standards.length
    ? `This pattern follows:\n\n${p.standards.map((s) => `- ${specLink(s)}`).join("\n")}`
    : "No native element or WAI-ARIA APG pattern covers this.";
  /** @type {Block[]} */
  const blocks = [md(p.summary)];
  if (p.ourChoice) blocks.push(md(ourChoiceMd(p.ourChoice)));
  if (!p.available) blocks.push(md(`Coming in ${p.milestone}.`));
  blocks.push(md(`## Standard\n\n${standard}\n\nLevel: ${level}. Milestone: ${milestoneLabel(p.milestone)}.`));

  if (p.available) {
    const doc = p.doc;
    if (doc && (doc.api || doc.apiInline.length)) {
      const api = [...(doc.api ? [fence(doc.api, "text")] : []), ...doc.apiInline.map((l) => `- ${mdCode(l)}`)];
      blocks.push(md(`## API\n\n${api.join("\n\n")}`));
    }
    blocks.push(
      p.examplePaths.length
        ? liveExampleBlock(model, p.examplePaths, p.title)
        : md(`## Live example\n\nThere is no standalone example page for ${p.title.toLowerCase()} yet.`),
    );
    blocks.push(...(p.snippets.length ? markupBlocks(p.snippets) : [md("## Markup\n\nNo markup snippet yet: there is no example page and no `Example` block in the CSS header comment.")]));
    blocks.push(keyboardBlock(model, p));
    if (p.body) blocks.push(md(`## Notes\n\n${rewriteRepoLinks(p.body, model)}`));
    if (doc?.a11y.length) blocks.push(md(`## Accessibility\n\nFrom the CSS header comment: ${commentMd(doc.a11y.join(" "))}`));
    const known = new Set([...p.standards, ...p.specs].map((s) => s.url));
    const fromCss = (doc?.urls ?? []).filter((u) => !known.has(u)).map((url) => ({ label: specLabel(url), url }));
    const specs = [...p.standards, ...p.specs, ...fromCss];
    blocks.push(md(`## Specs\n\n${specs.map((s) => `- **${escapeMdCell(s.label)}**: [${s.url.replace(/^https?:\/\//, "")}](${s.url})`).join("\n")}`));
    const sources = [...p.cssPaths, ...p.examplePaths, p.contentPath].map((s) => `- [\`${s}\`](${BLOB_URL}${s})`);
    blocks.push(md(`## Source\n\n${sources.join("\n")}`));
  }

  return {
    path: p.sitePath,
    section: "patterns",
    navNote: patternNavNote(p),
    title: p.title,
    heading: p.title,
    description: plainMd(p.summary),
    source: edit(p.contentPath),
    blocks,
    snippets: p.available ? p.snippets : [],
  };
}

/** @param {Model} model @returns {Page} */
function guidesIndex(model) {
  return {
    path: "guides/index.html",
    section: "guides",
    title: "Guides",
    heading: "Guides",
    description: "Step-by-step guides for building with domestic-ui.",
    source: { href: `${REPO_URL}/tree/main/site/content/guides`, label: "Browse the guides source on GitHub" },
    blocks: [md(guideListMd(model))],
  };
}

/**
 * Expand the generated lines of a guide, so its status never goes stale:
 *   {{patterns: tabs, disclosure}}  those patterns with their status, then which are not available yet
 *   {{layouts}}                     the layout primitives
 * @param {Model} model
 * @param {Guide} g
 */
function expandGuide(model, g) {
  return g.body.replace(/^\{\{\s*(patterns|layouts)\s*(?::\s*([^}]*))?\}\}[ \t]*$/gm, (_, kind, args = "") => {
    if (kind === "layouts") return model.layouts.map(componentLine).join("\n");
    const list = args
      .split(",")
      .map((/** @type {string} */ s) => s.trim())
      .filter(Boolean)
      .map((/** @type {string} */ slug) => {
        const p = model.patterns.find((x) => x.slug === slug);
        if (!p) throw new Error(`${g.contentPath}: no pattern "${slug}" in site/content/patterns/`);
        return p;
      });
    const coming = list.filter((p) => !p.available).map((p) => `${p.title} (${p.milestone})`);
    const status = !coming.length
      ? "All of these are available."
      : coming.length === list.length
        ? `None of these are available yet: ${coming.join(", ")}.`
        : `Not available yet: ${coming.join(", ")}.`;
    return `${list.map(patternLine).join("\n")}\n\n${status}`;
  });
}

/** @param {Model} model @param {Guide} g @returns {Page} */
function guidePage(model, g) {
  return {
    path: g.sitePath,
    section: "guides",
    title: g.title,
    heading: g.title,
    description: plainMd(g.summary),
    source: edit(g.contentPath),
    blocks: [md(rewriteRepoLinks(expandGuide(model, g), model))],
  };
}
