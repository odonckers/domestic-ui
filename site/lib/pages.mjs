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
import { BLOB_URL, REPO_URL, byString, escapeHtml, escapeMdCell, fence, firstSentence, mdCode, slugify } from "./util.mjs";

/**
 * @typedef {import("./discovery.mjs").Model} Model
 * @typedef {import("./discovery.mjs").Component} Component
 * @typedef {import("./discovery.mjs").Pattern} Pattern
 * @typedef {import("./discovery.mjs").Guide} Guide
 * @typedef {import("./discovery.mjs").Snippet} Snippet
 * @typedef {{ link: (target: string) => string, heading: (level: number, text: string) => string }} HtmlContext
 * @typedef {{ md: string, html?: (ctx: HtmlContext) => string }} Block
 * @typedef {"home" | "principles" | "tokens" | "components" | "atoms" | "molecules" | "organisms" | "layouts" | "patterns" | "guides" | "examples"} Section
 * @typedef {object} Page
 * @property {string} path         site path of the HTML page, e.g. "tokens/space.html"
 * @property {Section} section
 * @property {string} [group]      sub-heading in the section nav, e.g. "Atoms"
 * @property {string} title        used in <title>, nav and llms.txt
 * @property {string} heading      the page's h1
 * @property {string} description  meta description and llms.txt note
 * @property {{ href: string, label: string }} source  footer link to the source
 * @property {Block[]} blocks
 * @property {Snippet[]} [snippets] copy-paste markup shown on the page, in order
 */

/** The Docs nav, by level. components/index.html (all levels) is reached from each level's section nav. */
export const SECTIONS = /** @type {const} */ ([
  { section: "home", path: "index.html", title: "Overview" },
  { section: "principles", path: "principles/index.html", title: "Principles" },
  { section: "tokens", path: "tokens/index.html", title: "Tokens" },
  { section: "atoms", path: "atoms/index.html", title: "Atoms" },
  { section: "molecules", path: "molecules/index.html", title: "Molecules" },
  { section: "organisms", path: "organisms/index.html", title: "Organisms" },
  { section: "layouts", path: "layouts/index.html", title: "Layouts" },
  { section: "patterns", path: "patterns/index.html", title: "Patterns" },
  { section: "guides", path: "guides/index.html", title: "Guides" },
  { section: "examples", path: "examples.html", title: "Examples" },
]);

/** The overview of every level, and the level pages it links in its section nav. */
export const COMPONENTS_INDEX = "components/index.html";
export const LEVEL_SECTIONS = /** @type {const} */ (["atoms", "molecules", "organisms", "layouts"]);

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
  if (path === "css/tokens/semantic.css") return "site:tokens/index.html";
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

/** The component API convention, for components/index.html and README.md. @param {Model} model */
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
  const link = `[component API convention](site:${COMPONENTS_INDEX}#component-api)`;
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

/** The section-nav group of a pattern page. @param {string} milestone */
const milestoneLabel = (milestone) => (MILESTONES[milestone] ? `${milestone}: ${MILESTONES[milestone]}` : milestone);

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

/** @param {Model} model @returns {Page[]} */
export function buildPages(model) {
  // Base elements and utilities live in the Atoms section; utilities as their own nav group.
  const levelPages = COMPONENT_GROUPS.flatMap(({ group }) => [
    levelIndex(model, group),
    ...(group === "atoms" ? [model.base] : []).map((c) => ({ ...componentPage(model, c), section: /** @type {Section} */ ("atoms") })),
    ...model.components[group].map((c) => ({ ...componentPage(model, c), section: /** @type {Section} */ (group) })),
    ...(group === "atoms" ? model.utilities : []).map((c) => ({ ...componentPage(model, c), section: /** @type {Section} */ ("atoms"), group: "Utilities" })),
  ]);
  return [
    homePage(model),
    principlesIndex(model),
    ...model.principles.sections.map((s) => principlePage(model, s)),
    tokensIndex(model),
    ...model.tokenGroups.map((g) => tokenPage(g)),
    componentsIndex(model),
    ...levelPages,
    layoutsIndex(model),
    ...model.layouts.map((c) => ({ ...componentPage(model, c), section: /** @type {Section} */ ("layouts") })),
    patternsIndex(model),
    ...sortedPatterns(model).map((p) => ({ ...patternPage(model, p), group: milestoneLabel(p.milestone) })),
    guidesIndex(model),
    ...model.guides.map((g) => guidePage(model, g)),
    examplesPage(model),
  ];
}

/** @param {Model} model @returns {Page} */
function homePage(model) {
  const groups = componentListMd(model);
  return {
    path: "index.html",
    section: "home",
    title: "Overview",
    heading: "domestic-ui",
    description: firstSentence(plainMd(model.intro)),
    source: edit("site/content/readme-intro.md"),
    blocks: [
      md(model.intro),
      md(`## Install and use\n\n${installMd(model)}`),
      md(`## Layer order\n\n${layersMd(model)}`),
      md(`## Theming\n\n${themingMd(model)}`),
      md(`## Principles\n\n${principleListMd(model)}`),
      md(`## Tokens\n\n${tokenListMd(model)}`),
      md(`## Components by level\n\n${conventionShortMd(model)} See [Components](site:${COMPONENTS_INDEX}#component-api).\n\n${groups}`),
      md(`## Patterns\n\n${patternIntroMd}\n\n${sortedPatterns(model).map(patternLine).join("\n")}`),
      md(`## Guides\n\n${guideListMd(model)}`),
      md(`## Examples\n\n${model.examples.map((e) => `- [${e.title}](site:${e.path})`).join("\n")}`),
      md(`## Demos\n\n${demoListMd(model)}`),
      md(`## For coding agents

- [llms.txt](site:llms.txt): an index of these docs in the [llms.txt](https://llmstxt.org/) format.
- [llms-full.txt](site:llms-full.txt): every page in one Markdown file.
- Every docs page has a Markdown twin at the same path with \`.md\` instead of \`.html\`.`),
    ],
  };
}

/** @param {Model} model */
const principleListMd = (model) => model.principles.sections.map((s, i) => `${i + 1}. [${s.title}](site:${s.sitePath})`).join("\n");

/** @param {Model} model */
const tokenListMd = (model) =>
  model.tokenGroups.map((g) => `- [${g.name}](site:${g.sitePath}): ${g.tokens.length} token${g.tokens.length === 1 ? "" : "s"}`).join("\n");

/** @param {Component} c */
const componentLine = (c) => `- [${c.title}](site:${c.sitePath}): ${commentMd(c.summary)}`;

/**
 * Every level (Tokens, Atoms, Molecules, Organisms, Layouts), then Utilities,
 * as H3 sections. With `details`, each component group also gets its README's
 * Our choices and Not shipped table as H4 sections.
 * @param {Model} model
 * @param {boolean} [details]
 */
function componentListMd(model, details = false) {
  const out = LEVELS.map(({ level, title }) => {
    const extra = details ? groupDetailsMd(model, level, 4) : "";
    return `### ${title}\n\n${levelMd(model, level)}${extra ? `\n\n${extra}` : ""}`;
  });
  out.push(`### Utilities\n\n${model.utilities.map(componentLine).join("\n")}`);
  return out.join("\n\n");
}

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

/** Demo apps on GitHub, each with the first line of its README. @param {Model} model */
export const demoListMd = (model) =>
  model.demos.length ? model.demos.map((d) => `- [\`${d.path}\`](${REPO_URL}/tree/main/${d.path.replace(/\/$/, "")}): ${d.description}`).join("\n") : "No demo apps yet.";

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

/** @param {Model} model @returns {Page} */
function tokensIndex(model) {
  return {
    path: "tokens/index.html",
    section: "tokens",
    title: "Tokens",
    heading: "Tokens",
    description: "The two tiers of domestic-ui design tokens and the groups of public semantic tokens.",
    source: edit("css/tokens/semantic.css"),
    blocks: [
      md(`All tokens are [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) on \`:root\` with the \`--dui-\` prefix, in two tiers:

- **Primitive** tokens, in [\`css/tokens/primitives.css\`](${BLOB_URL}css/tokens/primitives.css), are named by what they are, such as \`--dui-color-blue-600\`. They are internal and may change in any release.
- **Semantic** tokens, in [\`css/tokens/semantic.css\`](${BLOB_URL}css/tokens/semantic.css), are named by what they are for, such as \`--dui-color-accent\`. They are the public theming API: renaming or removing one is a breaking change.

Base, layout, utility and component CSS use only semantic tokens; \`npm run lint:tokens\` enforces this. To theme, override semantic tokens: see [Theming](site:${principleLink(model, "theming")}) and the [theming example](site:examples/theming.html).`),
      md(`## Semantic token groups\n\nThe groups follow the section comments in \`css/tokens/semantic.css\`.\n\n${tokenListMd(model)}`),
    ],
  };
}

/** Which visual sample a token gets, by name. @param {string} name */
function sampleKind(name) {
  if (/^--dui-color-/.test(name)) return "color";
  if (/^--dui-shadow-/.test(name)) return "shadow";
  if (/^--dui-(space|size)-|^--dui-measure$/.test(name)) return "length";
  if (/^--dui-step-|^--dui-font-size-/.test(name)) return "font-size";
  if (/^--dui-font-(body|mono|heading)$/.test(name)) return "font-family";
  if (/^--dui-font-weight-/.test(name)) return "font-weight";
  if (/^--dui-letter-spacing-/.test(name)) return "letter-spacing";
  if (/^--dui-radius-/.test(name)) return "radius";
  if (/^--dui-(border-width|focus-width)/.test(name)) return "border-width";
  if (/^--dui-opacity-/.test(name)) return "opacity";
  return "";
}

/** @param {string} kind @param {string} name */
function sampleHtml(kind, name) {
  if (!kind) return "";
  const text = /font|letter/.test(kind) ? "Aa Bb Cc" : "";
  return `<span class="token-sample" data-sample="${kind}" style="--token-sample: var(${name})" aria-hidden="true">${text}</span>`;
}

/** @param {Model["tokenGroups"][number]} g @returns {Page} */
function tokenPage(g) {
  const caption = /\btokens$/i.test(g.name) ? g.name : `${g.name} tokens`;
  const value = (/** @type {Model["tokenGroups"][number]["tokens"][number]} */ t) =>
    [mdCode(t.value), ...t.conditions.map((c) => `with ${mdCode(`@media ${c.media}`)}: ${mdCode(c.value)}`)].join("; ");
  const valueHtml = (/** @type {Model["tokenGroups"][number]["tokens"][number]} */ t) =>
    [`<code>${escapeHtml(t.value)}</code>`, ...t.conditions.map((c) => `with <code>@media ${escapeHtml(c.media)}</code>: <code>${escapeHtml(c.value)}</code>`)].join("; ");
  const hasPurpose = g.tokens.some((t) => t.purpose);
  const head = ["Token", "Value in css/tokens/semantic.css", ...(hasPurpose ? ["Purpose (from PRINCIPLES.md)"] : [])];
  const tableMd = [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...g.tokens.map((t) => `| ${[mdCode(t.name), escapeMdCell(value(t)), ...(hasPurpose ? [escapeMdCell(t.purpose)] : [])].join(" | ")} |`),
  ].join("\n");
  const tableHtml = () => {
    const ths = [...head, "Sample"].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("");
    const rows = g.tokens.map((t) => {
      const purpose = hasPurpose ? `<td>${inlinePurpose(t.purpose)}</td>` : "";
      return `<tr><th scope="row"><code>${escapeHtml(t.name)}</code></th><td>${valueHtml(t)}</td>${purpose}<td>${sampleHtml(sampleKind(t.name), t.name)}</td></tr>`;
    });
    return `<table class="token-table">\n<caption>${escapeHtml(caption)}</caption>\n<thead>\n<tr>${ths}</tr>\n</thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table>`;
  };
  const note = g.note ? `${commentMd(g.note.charAt(0).toUpperCase() + g.note.slice(1))}\n\n` : "";
  return {
    path: g.sitePath,
    section: "tokens",
    title: caption,
    heading: caption,
    description: `Semantic ${caption.toLowerCase()} and their values (${g.tokens.length}).`,
    source: edit("css/tokens/semantic.css"),
    blocks: [
      md(
        `${note}Defined in [\`css/tokens/semantic.css\`](${BLOB_URL}css/tokens/semantic.css). Values are shown as written there; names inside \`var()\` that are not semantic tokens are internal primitives (see [Tokens](site:tokens/index.html)). Samples are decorative; the token name and value are the reference.`,
      ),
      { md: tableMd, html: tableHtml },
    ],
  };
}

/** Purpose cells may contain inline Markdown from PRINCIPLES.md. @param {string} text */
const inlinePurpose = (text) => inline(text);

/** @param {Model} model @returns {Page} */
function componentsIndex(model) {
  return {
    path: "components/index.html",
    section: "components",
    title: "Components",
    heading: "Components",
    description: "Everything in domestic-ui by level: tokens, atoms, molecules, organisms and layouts, plus utilities.",
    source: edit("css/components/README.md"),
    blocks: [
      md(`Each layout primitive, utility and component has one documented API, written in the header comment of its CSS file and tuned with custom properties ([Agent-friendly by design](site:${principleLink(model, "agent-friendly-by-design")})).

The levels follow [atomic design](https://atomicdesign.bradfrost.com/chapter-2/). Planned [patterns](site:patterns/index.html) are listed at their level with their status.`),
      md(`## Component API\n\n${conventionMd(model)}`),
      md(shiftHeadings(componentListMd(model, true), -1)),
    ],
  };
}

/**
 * The index page of one component level (Atoms, Molecules, Organisms):
 * its components, with base elements and utilities under Atoms, the
 * patterns planned at that level, and the group README's choices.
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
      `${group === "atoms" ? "Atoms add the minimum on top of the base layer: plain HTML already looks right, and an atom covers what a native element cannot say on its own. " : ""}Components use one \`data-<component>\` attribute each; see the [component API convention](site:${COMPONENTS_INDEX}#component-api) and [every level](site:${COMPONENTS_INDEX}).`,
    ),
  ];
  if (group === "atoms") blocks.push(md(`## Base elements\n\n${componentLine(model.base)}`));
  blocks.push(md(`## ${title}\n\n${[...items, ...patterns].join("\n") || `Coming in ${milestone}; see the [components README](${BLOB_URL}css/components/README.md).`}`));
  if (group === "atoms" && model.utilities.length) blocks.push(md(`## Utilities\n\n${model.utilities.map(componentLine).join("\n")}`));
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
    section: "components",
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
    section: "examples",
    title: "Examples",
    heading: "Examples",
    description: "Standalone example pages that load the real domestic-ui CSS.",
    source: { href: `${REPO_URL}/tree/main/examples`, label: "Browse the examples source on GitHub" },
    blocks: [md("Standalone HTML pages that load `css/domestic.css`, nothing else. Open one, or read its source on GitHub."), ...sections.map(md)],
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
