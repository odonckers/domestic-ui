// @ts-check
/*
 * Page definitions. Each page is a list of blocks; a block is Markdown
 * (rendered to HTML by ./markdown.mjs and used as-is for the .md twin) or a
 * pair of custom HTML and its Markdown equivalent (live examples, token
 * tables with samples, live examples with their markup).
 *
 * Links between pages are written as "site:<path>" and resolved per output:
 * relative in HTML, absolute in Markdown (see ./templates.mjs).
 */
import { apiMd, codeMd, labelledMd } from "./api-table.mjs";
import { findUrls, specName } from "./css-comments.mjs";
import { demoAppLinksMd, demoViewMd } from "./demo-views.mjs";
import { diagramBlock, diagramName } from "./diagrams.mjs";
import { COMPONENT_GROUPS, LEVELS } from "./discovery.mjs";
import { inline, plainText, shiftHeadings, tokenize } from "./markdown.mjs";
import { previewKind } from "./tokens.mjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOB_URL, REPO_URL, archiveUrl, byString, escapeHtml, escapeMdCell, fence, firstSentence, mdCode, releaseUrl, slugify } from "./util.mjs";

/**
 * @typedef {import("./discovery.mjs").Model} Model
 * @typedef {import("./discovery.mjs").Component} Component
 * @typedef {import("./discovery.mjs").Pattern} Pattern
 * @typedef {import("./discovery.mjs").Guide} Guide
 * @typedef {import("./discovery.mjs").Snippet} Snippet
 * @typedef {{ link: (target: string) => string, heading: (level: number, text: string) => string }} HtmlContext
 * @typedef {{ md: string, html?: (ctx: HtmlContext) => string, inFull?: false }} Block  inFull false: on the page and its twin, not in llms-full.txt
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
 * @property {Snippet[]} [snippets] the snippets rendered and printed on the page, in order
 * @property {false} [inFull]      false: left out of llms-full.txt (a list of other pages, a guide, a repository file)
 * @property {true} [wide]         wide tables are the content (token pages): the full width of main, no "On this page"
 * @property {string} [diagram]    element and pattern pages: the name of their header diagram, site/assets/diagrams/<name>.svg (./diagrams.mjs)
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
  // Example pages are not published; their snippets live on one docs page each.
  if (path.startsWith("examples/")) return `site:${model.exampleTargets[path] ?? "index.html"}`;
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
export const installMd = (model) => {
  const get = model.version
    ? `The current release is **${model.version}** ([release notes](${releaseUrl(model.version)}), [changelog](site:changelog.html)). Download the [v${model.version} source archive](${archiveUrl(model.version)}), copy its \`css/\` folder into your project and link the entry point:`
    : `Copy \`css/\` from the [repository](${REPO_URL}) into your project and link the entry point:`;
  return `Plain CSS, no build step. ${get}

\`\`\`html
<link rel="stylesheet" href="css/domestic.css">
\`\`\`

Imports are relative, so it works from any path. Paths under \`css/\` are public API ([Agent-friendly by design](site:${principleLink(model, "agent-friendly-by-design")})), versioned with [Semantic Versioning](https://semver.org/spec/v2.0.0.html).`;
};

/** @param {Model} model */
export const layersMd = (model) => `\`css/domestic.css\` declares the [cascade layers](site:${principleLink(model, "cascade-layers")}), lowest priority first. Your unlayered CSS beats all of them.

\`\`\`css
@layer ${model.layers.join(", ")};
\`\`\``;

/** @param {Model} model */
export const themingMd = (model) => `Override semantic \`--dui-*\` tokens on \`:root\`, or on an element with \`data-theme\` ([Theming](site:${principleLink(model, "theming")}), with a live example). Force a scheme with \`data-color-scheme="light"\` or \`"dark"\`.`;

const ATTRIBUTE_SELECTORS_URL = "https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors";
const REL_URL = "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel";

/**
 * The layout primitive and utility APIs, as code: `.cluster`, `.grid`, …;
 * an attribute where the API block names one instead of a class (`data-scroll`).
 * @param {Model} model
 */
export const classApis = (model) =>
  [...model.layouts, ...model.utilities]
    .map((c) => {
      const attr = !/class="/.test(c.api ?? "") && (c.api ?? "").match(/\b(data-[a-z][\w-]*)/)?.[1];
      return `\`${attr || `.${c.name}`}\``;
    })
    .join(", ");

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
  return `Each component exposes one \`data-<component>\` attribute. Its value is space-separated words matched with the [\`~=\` selector](${ATTRIBUTE_SELECTORS_URL}), like [\`rel\`](${REL_URL}): \`data-button="primary small"\`. State uses native attributes and ARIA: \`disabled\`, \`aria-disabled\`, \`aria-busy\`, \`aria-invalid\`.

${why ? `**Our choice:** ${why}\n\n` : ""}Layout primitives and utilities: ${classApis(model)}. Base elements need no API.`;
}

/** The convention in one paragraph, for llms.txt. @param {Model} model */
export const conventionShortMd = (model) =>
  `Components: one \`data-<component>\` attribute of space-separated words matched with \`~=\` (\`data-button="primary small"\`), no classes; state via native attributes and ARIA. Layout primitives and utilities: ${classApis(model)}.`;

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

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

/** @param {Model} model @returns {Page[]} */
export function buildPages(model) {
  // In the order of the Docs sidebar (./nav.mjs), which lists each section's pages in this order.
  const as = (/** @type {Page} */ page, /** @type {Section} */ section) => ({ ...page, section });
  return [
    homePage(model),
    principlesIndex(model),
    ...model.principles.sections.map((s) => principlePage(model, s)),
    tokensIndex(model),
    ...model.tokenFiles.map((f) => tokenFilePage(model, f)),
    as(componentPage(model, model.base), "base"),
    ...model.utilities.map((c) => as(componentPage(model, c), "base")),
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

/**
 * A layout header comment sentence dropped from its page: examples/ is not
 * published, and the live example is on the page itself.
 */
const STALE_LAYOUT_NOTE = "Live examples are in examples/base.html#layout.";

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
      md(`## How these docs are organized

${organizationMd(model)}`),
      md(`## For coding agents

[llms.txt](site:llms.txt) ([format](https://llmstxt.org/)) indexes these docs; [llms-full.txt](site:llms-full.txt) has every page. Each page has a Markdown twin: same path, \`.md\`.`),
    ],
  };
}

/** Brad Frost's Atomic Design, which the component levels follow. */
export const ATOMIC_DESIGN_URL = "https://atomicdesign.bradfrost.com/";

/** How the sidebar is organized, in one paragraph. @param {Model} model */
const organizationMd = (model) => {
  const levels = COMPONENT_GROUPS.map(({ group, title }) => `[${title.toLowerCase()}](site:${group}/index.html)`);
  return `The sidebar follows Brad Frost's [Atomic Design](${ATOMIC_DESIGN_URL}): [tokens](site:tokens/index.html), then [base elements](site:${model.base.sitePath}) and [layouts](site:layouts/index.html), then ${levels.slice(0, -1).join(", ")} and ${levels.at(-1)}. [Patterns](site:patterns/index.html) combine them. The [principles](site:principles/index.html) explain each choice.`;
};

/** @param {Model} model */
const principleListMd = (model) => model.principles.sections.map((s, i) => `${i + 1}. [${s.title}](site:${s.sitePath})`).join("\n");

/** Token pages with their counts and groups. @param {Model} model */
const tokenListMd = (model) =>
  model.tokenFiles
    .map((f) => {
      const n = f.groups.reduce((sum, g) => sum + g.tokens.length, 0);
      return `- [${f.title}](site:${f.sitePath}): ${n} token${n === 1 ? "" : "s"}${f.tier ? `, ${f.tier}` : ""}.`;
    })
    .join("\n");

/** @param {Component} c */
const componentLine = (c) => `- [${c.title}](site:${c.sitePath}): ${summaryMd(c)}`;

/** A component's one-line summary, without URLs (they are listed under Specifications). @param {Component} c */
const summaryMd = (c) => commentMd(withoutUrls(c.summary));

/**
 * A component group's README sections: every Our choices bullet, labels
 * kept and with no heading of their own (each bullet says "Our choice:"),
 * and the Not shipped table under its heading.
 * @param {Model} model
 * @param {string} group
 * @param {number} level heading level
 */
function groupDetailsMd(model, group, level) {
  const readme = model.readmes[group];
  if (!readme) return { choices: "", notShipped: "" };
  const src = `[\`${readme.path}\`](${BLOB_URL}${readme.path})`;
  return {
    choices: readme.choices.length ? `From ${src}:\n\n${readme.choices.map((c) => `- ${rewriteRepoLinks(c, model)}`).join("\n")}` : "",
    notShipped: readme.notShipped ? `${"#".repeat(level)} Not shipped, and why\n\n${rewriteRepoLinks(readme.notShipped, model)}` : "",
  };
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

const patternIntroMd = `Each pattern follows a native HTML element or a [WAI-ARIA APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) where one exists. Otherwise it stays close to plain HTML and is labeled **Our choice**.`;

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
  // A principle shows the snippets that name it (page="principles/theming"), after its text.
  const snippets = model.principleSnippets[s.sitePath] ?? [];
  return {
    path: s.sitePath,
    section: "principles",
    title: s.title,
    heading: s.title,
    description: firstSentenceOf(s.body) || s.title,
    source: edit("PRINCIPLES.md"),
    blocks: [md(shiftHeadings(rewriteRepoLinks(s.body, model), -1)), ...(snippets.length ? liveExampleBlocks(model, snippets) : [])],
    snippets,
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
    if (table) return `From [${s.title}](site:${s.sitePath}):\n\n${rewriteRepoLinks(table.raw, model)}`;
  }
  return "";
}

/** How a token table's values are shown. @param {Model} model @param {boolean} fallbacks some descriptions come from PRINCIPLES.md */
const resolvedMd = (model, fallbacks) =>
  `**Light** and **Dark** resolve every \`var()\` and take one side of [\`light-dark()\`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark). Previews are decorative.${fallbacks ? ` † marks a description taken from the semantic token table in [Theming](site:${principleLink(model, "theming")}).` : ""}`;

/** @param {Model} model @returns {Page} */
function tokensIndex(model) {
  const all = model.tokenFiles.flatMap((f) => f.groups.flatMap((g) => g.tokens));
  return {
    path: "tokens/index.html",
    inFull: false,
    section: "tokens",
    title: "Tokens",
    heading: "Tokens",
    description: `The two tiers of domestic-ui design tokens: ${all.length} custom properties with their light and dark values.`,
    source: { href: `${REPO_URL}/tree/main/css/tokens`, label: "Browse css/tokens/ on GitHub" },
    blocks: [
      md(`[CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) on \`:root\`, prefixed \`--dui-\`, in two tiers. Semantic tokens are the public API, and the only ones base, layout and component CSS use (\`npm run lint:tokens\` checks). To theme, override them ([Theming](site:${principleLink(model, "theming")})).`),
      md(`## Token files\n\n${tokenListMd(model)}`),
      ...(tierTableMd(model) ? [md(`## Tiers\n\n${tierTableMd(model)}`)] : []),
    ],
  };
}

/**
 * A paragraph of a token file's header comment as Markdown: code spans for
 * code, repository paths and "PRINCIPLES.md, "Theming"" as links, and its
 * URL as the link of the term it explains ("Label: URL" becomes a link).
 * @param {Model} model
 * @param {string} para
 */
function tokenIntroMd(model, para) {
  const flat = para.replace(/\s+/g, " ").trim();
  const label = flat.match(/^([A-Z][\w ]{0,40}):\s*(https?:\/\/\S+?)\.?$/);
  if (label) return `[${label[1]}](${label[2]}).`;
  const urls = findUrls(flat);
  // Token file comments write code in backticks, so keep those as code spans.
  let out = withoutUrls(flat)
    .split(/(`[^`]+`)/)
    .map((part, i) => (i % 2 ? part : codeMd(part, commentMd)))
    .join("");
  out = out.replace(/`((?:css|examples|web-components)\/[\w./-]+)`/g, (m, path) => `[${m}](${repoTarget(path, model)})`);
  out = out.replace(/`PRINCIPLES\.md`, "([^"]+)"/g, (m, title) => {
    const s = model.principles.sections.find((x) => x.title === title);
    return s ? `[${title}](site:${s.sitePath})` : m;
  });
  if (urls.length === 1) {
    const term = out.match(/`[a-z][\w-]*\(\)`/)?.[0];
    out = term ? out.replace(term, `[${term}](${urls[0]})`) : `${out} ([${specName(urls[0])}](${urls[0]}))`;
  } else for (const url of urls) out += ` [${specName(url)}](${url})`;
  return out;
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
  const text = /^font|line-height|letter-spacing/.test(kind) ? "Aa" : "";
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

/**
 * The preview cell: one sample, or light then dark when they differ (and
 * always both for colors). Decorative: the Light and Dark cells of the
 * same row hold the values as text.
 * @param {Token} t
 */
function previewCell(t) {
  const shown = previewKind(t);
  const kind = previewable(shown === "font-family" ? t.light.replace(/"([A-Za-z][\w -]*)"/g, "$1") : t.light) ? shown : "text";
  if (kind === "text") return '<span class="token-text-only" data-text="muted">None</span>';
  const one = (/** @type {"light" | "dark"} */ scheme) => `<span class="token-sample" data-color-scheme="${scheme}"><span aria-hidden="true">${previewHtml(kind, t[scheme])}</span></span>`;
  return t.light === t.dark && kind !== "color" ? one("light") : `${one("light")}${one("dark")}`;
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
  const intro = [f.tier ? `**${f.tier.charAt(0).toUpperCase()}${f.tier.slice(1)}.** ` : "", f.intro.split("\n\n").map((p) => tokenIntroMd(model, p)).join("\n\n")].join("");
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
    const note = g.note ? `${commentMd(g.note.charAt(0).toUpperCase() + g.note.slice(1)).replace(/([^.])$/, "$1.")}` : "";
    const descMd = (/** @type {Token} */ t) => {
      const d = tokenDescription(t);
      return [d.text ? `${d.text}${d.from === "PRINCIPLES.md" ? " †" : ""}` : "No description yet.", ...conditionLines(t, false)].join(" ");
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
            ? `${d.from === "comment" ? inline(commentMd(d.text)) : inline(d.text)}${d.from === "PRINCIPLES.md" ? ' <span data-text="muted">†</span>' : ""}`
            : '<span class="token-missing">No description yet</span>';
          const conditions = conditionLines(t, true).map((l) => `<br>${l}`).join("");
          // How the file writes it, when that is not already the light or dark value.
          const written = t.value !== t.light || t.value !== t.dark ? `<br><span data-text="small muted">Written as <code>${escapeHtml(t.value)}</code></span>` : "";
          return `<tr><th scope="row"><code>${escapeHtml(t.name)}</code></th><td>${previewCell(t)}</td><td>${valueCode(t.light)}</td><td>${valueCode(t.dark)}</td><td>${text}${conditions}${written}</td></tr>`;
        });
        const head = ["Token", "Preview", "Light", "Dark", "Description"].map((h) => `<th scope="col">${h}</th>`).join("");
        const heading = ctx.heading(2, g.name);
        const id = heading.match(/ id="([^"]+)"/)?.[1] ?? "";
        return `<div class="token-group" data-token-group>
${heading}
${note ? `<p>${inline(note)}</p>\n` : ""}<div data-scroll="inline" tabindex="0" role="region" aria-labelledby="${id}">
<table class="token-table" aria-labelledby="${id}">
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
    wide: true,
    title: f.title,
    heading: f.title,
    description: `All ${count} ${short} in ${f.path}${f.tier ? ` (${f.tier})` : ""}, with resolved light and dark values.`,
    source: edit(f.path),
    blocks: [
      md(`${intro}\n\n${count} tokens in ${fileLink}. ${resolvedMd(model, f.groups.some((g) => g.tokens.some((t) => tokenDescription(t).from === "PRINCIPLES.md")))}`),
      filter,
      ...f.groups.map(groupBlock),
    ],
  };
}

/** The "Coming in M3" note shown after a planned pattern's sidebar link. @param {Pattern} p */
const patternNavNote = (p) => (p.available ? "" : `coming in ${p.milestone}`);

/** One line on what each component level holds. */
const LEVEL_INTROS = /** @type {Record<string, string>} */ ({
  atoms: "Small additions to the base layer, for what a native element cannot express on its own.",
  molecules: "Small groups of atoms that work as one unit.",
  organisms: "Larger sections of an interface built from molecules and atoms.",
});

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
      `${LEVEL_INTROS[group] ?? ""} A level of [Atomic Design](${ATOMIC_DESIGN_URL}); APIs follow the [component API convention](site:${CONVENTION_LINK}).`.trim(),
    ),
  ];
  const details = groupDetailsMd(model, group, 2);
  if (details.choices) blocks.push(md(details.choices));
  // The list repeats each page's summary, which opens that page's own part of llms-full.txt.
  blocks.push({ ...md(`## Pages\n\n${[...items, ...patterns].join("\n") || `Coming in ${milestone}; see the [components README](${BLOB_URL}css/components/README.md).`}`), inFull: false });
  if (details.notShipped) blocks.push(md(details.notShipped));
  return {
    path: `${group}/index.html`,
    ...(details.choices || details.notShipped ? {} : { inFull: /** @type {const} */ (false) }),
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
    inFull: false,
    section: "layouts",
    title: "Layouts",
    heading: "Layouts",
    description: "Layout primitives and planned page layouts of domestic-ui.",
    source: edit(model.layouts[0]?.cssPath ?? "PRINCIPLES.md"),
    blocks: [
      md(`Layout primitives arrange their children and nothing else ([Layout primitives](site:${principleLink(model, "layout-primitives")})). Each is one class or attribute, tuned with custom properties.`),
      md(`## All layouts\n\n${levelMd(model, "layouts")}`),
    ],
  };
}

/**
 * The "Our choice" line, for things no native element or APG pattern covers.
 * @param {string} why Markdown
 */
const ourChoiceMd = (why) => `**Our choice:** ${why}`;

/** The title of a docs page by site path, for "Used in" links. @param {Model} model @param {string} path */
const pageTitle = (model, path) =>
  [...allComponents(model), ...model.patterns, ...model.principles.sections].find((x) => x.sitePath === path)?.title ?? path;

/** Repo path of the snippet notes: prose about a snippet, shown under its name (snippets hold working code only, no comments). */
export const SNIPPET_NOTES_PATH = "site/data/snippet-notes.json";

/**
 * Snippet notes, { "<example path>": { "<snippet name>": "Markdown" } }.
 * Throws when a note names a snippet that does not exist.
 * @param {Model} model
 * @returns {Record<string, Record<string, string>>}
 */
function snippetNotes(model) {
  const file = join(model.root, SNIPPET_NOTES_PATH);
  if (!existsSync(file)) return {};
  const notes = JSON.parse(readFileSync(file, "utf8"));
  for (const [source, byName] of Object.entries(notes)) {
    for (const name of Object.keys(byName)) {
      if (!model.snippets.some((s) => s.source === source && s.name === name)) throw new Error(`${SNIPPET_NOTES_PATH}: no snippet "${name}" in ${source}`);
    }
  }
  return notes;
}

/** Snippets that open something in the top layer need a taller frame. */
const TALL_RE = /<dialog\b|\spopover\b|<dui-(?:menu|toaster|tooltip)\b/;

/**
 * The live example: per snippet, its name, its render (an iframe of its
 * build-generated page under live/, see ./live.mjs) and directly below, its
 * markup from the same text (HTML: <pre data-snippet>; Markdown: a
 * long-enough fence). A head snippet (a theme's <style>) has no render of its
 * own: it follows the first render of its example, which loads it.
 * @param {Model} model
 * @param {Snippet[]} snippets owned by the page, in the order shown (see loadModel())
 * @param {string[]} [usedIn] docs pages that use it, when it has no snippet of its own
 * @returns {Block[]}
 */
function liveExampleBlocks(model, snippets, usedIn = []) {
  if (!snippets.length) {
    const used = usedIn.map((p) => `[${pageTitle(model, p)}](site:${p})`);
    return [md(`## Live example\n\nNone yet.${used.length ? ` Used in ${used.join(", ")}.` : ""}`)];
  }
  return [
    { md: "## Live example", html: (ctx) => ctx.heading(2, "Live example") },
    ...snippets.map((s) => {
      const note = s.head ? "In the `<head>` of the live example above." : "";
      const about = snippetNotes(model)[s.source]?.[s.name] ?? "";
      return {
        md: `### ${s.name}\n\n${about ? `${about}\n\n` : ""}${note ? `${note}\n\n` : ""}${fence(s.code, "html")}`,
        html: (/** @type {HtmlContext} */ ctx) =>
          [
            ctx.heading(3, s.name),
            ...(about ? [`<p>${inline(about, { resolveLink: (href) => (href.startsWith("site:") ? ctx.link(href.slice(5)) : href) })}</p>`] : []),
            s.live
              ? `<iframe class="example-frame" data-live${TALL_RE.test(s.code) ? " data-tall" : ""} src="${escapeHtml(ctx.link(s.live))}" title="Live example: ${escapeHtml(s.name)}"></iframe>`
              : `<p>${inline(note)}</p>`,
            `<pre data-snippet="${escapeHtml(s.source)}" data-scroll="inline" role="region" tabindex="0" aria-label="Markup: ${escapeHtml(s.name)}"><code>${escapeHtml(s.code)}</code></pre>`,
          ].join("\n"),
      };
    }),
  ];
}

/**
 * Comment prose without its URLs: every URL in a header comment is already
 * listed, labelled, under Specifications. Drops "(URL)", "Label: URL" and
 * bare URLs.
 * @param {string} text
 */
const withoutUrls = (text) =>
  text
    .replace(/\s*\(\s*https?:\/\/[^\s)]+\s*\)/g, "")
    .replace(/(^|[.;]\s+)[A-Z][\w ]{0,40}:\s*https?:\/\/\S+/g, "$1")
    .replace(/\s*https?:\/\/\S+/g, "")
    .replace(/\s+([.,;)]|:(?!\S))/g, "$1")
    .replace(/[,:;]\)/g, ")")
    .replace(/[,:;]\s*$/, ".")
    .trim();

/** Sentences of comment prose. @param {string} text */
const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-Z<"`(])/).map((s) => s.trim()).filter(Boolean);

/** Specifications as a list of labelled links. @param {{ label: string, url: string }[]} specs */
const specListMd = (specs) => specs.map((s) => `- ${specLink(s)}`).join("\n");

/**
 * @param {Model} model
 * @param {Component} c
 * @returns {Page}
 */
function componentPage(model, c) {
  /** @type {Block[]} */
  const blocks = [md(summaryMd(c))];
  if (c.ourChoice) blocks.push(md(ourChoiceMd(c.ourChoice)));
  // Base elements is an overview of many elements: no single place to draw.
  const diagram = c.group === "base" ? undefined : diagramName(c.sitePath);
  blocks.push(...leadDiagram(model, diagram));

  // Attributes: the index row's cell as written, then the CSS header's API block as tables.
  const isClass = c.group === "layouts" || c.group === "utilities";
  const api = [];
  if (c.group === "base") api.push("None: write semantic HTML.");
  if (c.indexApi) api.push(c.indexApi);
  if (c.api) api.push(apiMd(c.api, commentMd));
  if (c.apiInline.length) api.push(c.apiInline.map((line) => `- ${mdCode(line)}`).join("\n"));
  if (c.files.length) {
    const rows = c.files.map((f) => `| [${mdCode(f.path)}](${BLOB_URL}${f.path}) | ${escapeMdCell(commentMd(f.summary)) || "–"} |`);
    api.push(`| File | Covers |\n| --- | --- |\n${rows.join("\n")}`);
  }
  // Notes: comment prose that is not repeated under Accessibility.
  const a11ySentences = new Set(sentences(c.a11yFromOverride ? "" : c.a11y));
  const notes = c.notesFromOverride
    ? c.notes.length
      ? [c.notes.map((n) => `- ${rewriteRepoLinks(n, model)}`).join("\n")]
      : []
    : c.notes
        .map((n) => withoutUrls(sentences(n).filter((s) => !a11ySentences.has(s) && !(c.group === "layouts" && s === STALE_LAYOUT_NOTE)).join(" ")))
        .filter((n) => /\w/.test(n))
        .map(commentMd);

  const cssLink = `[\`${c.cssPath}\`](${BLOB_URL}${c.cssPath})`;
  const a11y = !c.ownCss
    ? `- Styled by the base layer; see [Base elements](site:${model.base.sitePath}).`
    : c.a11yFromOverride
      ? rewriteRepoLinks(c.a11y, model)
      : sentences(c.a11y)
          .map((s) => withoutUrls(s))
          .filter((s) => /\w/.test(s))
          .map((s) => `- ${commentMd(s)}`)
          .join("\n");

  const group = COMPONENT_GROUPS.find((g) => g.group === c.group);
  const level = group
    ? { title: group.title, path: `${c.group}/index.html` }
    : c.group === "layouts"
      ? { title: "Layouts", path: "layouts/index.html" }
      : c.group === "utilities"
        ? { title: "Base elements", path: model.base.sitePath }
        : null;
  const sources = [c.group === "base" ? `[\`css/base/\`](${REPO_URL}/tree/main/css/base)` : `${cssLink}${c.ownCss ? "" : " (base layer; no CSS file of its own)"}`];
  for (const src of new Set(c.snippets.map((s) => s.source))) sources.push(`[\`${src}\`](${BLOB_URL}${src})`);
  const seeAlso = [
    ...(level ? [`[${level.title}](site:${level.path})`] : []),
    ...(c.group === "base" ? [] : [`[Component API convention](site:${CONVENTION_LINK})`]),
    `[Accessibility baseline](site:${principleLink(model, "accessibility-baseline-wcag-22-aa")})`,
    `Source: ${sources.join(", ")}`,
    ...demosLine(model, c.sitePath),
  ];
  blocks.push(
    ...referenceBlocks({
      live: liveExampleBlocks(model, c.snippets, c.usedIn),
      apiTitle: isClass ? "API" : "Attributes",
      api: [...api, ...notes].join("\n\n"),
      // In llms-full.txt these bullets appear once, with all the others, on the level index.
      choices: c.indexPath ? c.choices.map((x) => rewriteRepoLinks(x, model)) : [],
      labelled: c.blocks,
      keyboard: c.keyboard.length ? keyboardTable(c.keyboard, false) : "",
      a11y,
      specs: c.specs.length ? specListMd(c.specs) : "",
      seeAlso,
    }),
  );

  return {
    path: c.sitePath,
    section: "atoms", // set by buildPages()
    title: c.title,
    heading: c.title,
    description: plainMd(summaryMd(c)),
    source: edit(c.overridePath ?? (c.group === "base" ? (c.files[0]?.path ?? "css/base/document.css") : c.ownCss ? c.cssPath : (c.indexPath ?? c.cssPath))),
    blocks,
    snippets: c.snippets,
    diagram,
  };
}

/**
 * The See also line naming the demo views that use a page, with each app's
 * source file. Empty when no view lists the page.
 * @param {Model} model
 * @param {string} sitePath "patterns/nav.html"
 * @returns {string[]}
 */
function demosLine(model, sitePath) {
  const data = model.demoViews;
  if (!data) return [];
  const page = sitePath.replace(/\.html$/, "");
  const views = data.views.filter((v) => v.pages.includes(page));
  return views.length ? [`Demos: ${views.map((v) => demoViewMd(model.root, data, v, page)).join("; ")}`] : [];
}

/**
 * The Views section on demos.html: one item per view, in the format of the
 * app list, with each app's source on GitHub.
 * @param {Model} model
 * @returns {Block[]}
 */
function demoViewsBlocks(model) {
  const data = model.demoViews;
  if (!data) return [];
  const note = `The demos are not published on GitHub Pages; run them locally as [\`demos/README.md\`](${BLOB_URL}demos/README.md) explains.`;
  const items = data.views.map((v) => `- **${v.title}**: ${v.description} Source: ${demoAppLinksMd(model.root, data, v)}.`);
  return [md(`## Views\n\n${note}\n\n${items.join("\n")}`)];
}

/** @param {Model} model @returns {Page} */
function demosPage(model) {
  const intro = model.demosIntro ? `${rewriteRepoLinks(model.demosIntro, model)}\n\n` : "";
  return {
    path: "demos.html",
    inFull: false,
    section: "demos",
    title: "Demos",
    heading: "Demos",
    description: model.demos.length ? "Demo apps in demos/ that use domestic-ui, each with a link to its source on GitHub." : "Demo apps: coming in M5.",
    source: { href: `${REPO_URL}/tree/main/demos`, label: "Browse demos/ on GitHub" },
    blocks: [
      md(
        model.demos.length
          ? `${intro}Source and run instructions are on GitHub.\n\n${demoListMd(model)}`
          : "Coming in M5.",
      ),
      ...demoViewsBlocks(model),
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
  const note = `From [\`${file}\`](${BLOB_URL}${file}); [edit ${file} on GitHub](${REPO_URL}/edit/main/${file}).`;
  return {
    path: `${section}.html`,
    inFull: false,
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
  const row = (/** @type {Pattern} */ p) => `| [${p.title}](site:${p.sitePath}) | ${patternStatus(p)} | ${escapeMdCell(p.standards.length ? followsMd(p) : "Our choice")} |`;
  // Grouped by level, as in the sidebar.
  const levels = LEVELS.filter((l) => model.patterns.some((p) => p.level === l.level));
  const guide = model.guides[0];
  const guideMd = guide ? ` Step by step: [${guide.title}](site:${guide.sitePath}).` : "";
  return {
    path: "patterns/index.html",
    inFull: false,
    section: "patterns",
    title: "Patterns",
    heading: "Patterns",
    description: "Planned and available interface patterns, from site navigation to app shells, with the standard each one follows.",
    source: { href: `${REPO_URL}/tree/main/site/content/patterns`, label: "Browse the pattern registry on GitHub" },
    blocks: [
      md(`${patternIntroMd}${guideMd}`),
      ...levels.map((l) => {
        const rows = sortedPatterns(model).filter((p) => p.level === l.level).map(row);
        return md(`## ${l.title}\n\n| Pattern | Status | Follows |\n| --- | --- | --- |\n${rows.join("\n")}`);
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

/** A Key | Action table. @param {{ key: string, action: string }[]} keys @param {boolean} markdown the notes are Markdown already */
const keyboardTable = (keys, markdown) =>
  `| Key | Action |\n| --- | --- |\n${keys.map((k) => `| ${escapeMdCell(kbdMd(k.key, markdown))} | ${escapeMdCell(markdown ? k.action : commentMd(k.action))} |`).join("\n")}`;

/**
 * Keyboard notes: the Keyboard block of the example page or CSS header,
 * else the registry's list, else one line pointing at the standard's
 * keyboard section; "" when there is no standard to point at.
 * @param {Pattern} p
 */
function keyboardMd(p) {
  if (p.keyboard.length) return keyboardTable(p.keyboard, p.keyboardFrom === "front matter");
  const apg = p.standards.find((s) => s.url.startsWith("https://www.w3.org/WAI/ARIA/apg/"));
  if (apg) return `See the keyboard section of the ${specLink(apg)}.`;
  if (p.standards.length) return `Native keyboard behavior; see ${specLink(p.standards[0])}.`;
  return "";
}

/**
 * The header diagram under the lead (summary and Our choice line), before
 * the first section; none when the file is missing, which build.mjs reports.
 * @param {Model} model
 * @param {string | undefined} name
 * @returns {Block[]}
 */
function leadDiagram(model, name) {
  const d = name ? model.diagrams.get(name) : undefined;
  return d ? [diagramBlock(d)] : [];
}

/**
 * The shared outline of every element and pattern page (site/README.md,
 * "Page structure"): Live example; Attributes (or API) with ### labelled
 * blocks (States, Sizes, Focus, Motion, …) and ### Keyboard; Accessibility;
 * Specifications; See also. "How other systems do it" is added last by
 * ./other-systems.mjs. Empty sections are left out.
 * @param {{ live: Block[], apiTitle: string, api: string, choices: string[], labelled: { label: string, text: string }[], keyboard: string, a11y: string, specs: string, seeAlso: string[] }} parts
 * @returns {Block[]}
 */
function referenceBlocks({ live, apiTitle, api, choices, labelled, keyboard, a11y, specs, seeAlso }) {
  /** @type {Block[]} */
  const blocks = [...live];
  const h3s = [...labelled.map((b) => `### ${b.label}\n\n${labelledMd(withoutUrls(b.text), commentMd)}`), ...(keyboard ? [`### Keyboard\n\n${keyboard}`] : [])];
  if (api || choices.length || h3s.length) {
    blocks.push(md(`## ${apiTitle}${api ? `\n\n${api}` : ""}`));
    // Each bullet keeps its "Our choice:" label (no heading of its own).
    if (choices.length) blocks.push({ ...md(choices.map((x) => `- ${x}`).join("\n")), inFull: false });
    if (h3s.length) blocks.push(md(h3s.join("\n\n")));
  }
  if (a11y) blocks.push(md(`## Accessibility\n\n${a11y}`));
  if (specs) blocks.push(md(`## Specifications\n\n${specs}`));
  if (seeAlso.length) blocks.push(md(`## See also\n\n${seeAlso.map((x) => `- ${x}`).join("\n")}`));
  return blocks;
}

/**
 * A pattern page. Until an example page or CSS file exists it shows only
 * the summary, the standard (or Our choice line) and when it is planned.
 * @param {Model} model
 * @param {Pattern} p
 * @returns {Page}
 */
function patternPage(model, p) {
  const level = LEVELS.find((l) => l.level === p.level);
  /** @type {Block[]} */
  const blocks = [md(p.summary)];
  if (p.ourChoice) blocks.push(md(ourChoiceMd(p.ourChoice)));
  if (!p.available) blocks.push(md(`Coming in ${p.milestone}.`));
  const diagram = diagramName(p.sitePath);
  blocks.push(...leadDiagram(model, diagram));

  const doc = p.available ? p.doc : null;
  const api = doc ? [...(doc.api ? [apiMd(doc.api, commentMd)] : []), ...(doc.apiInline.length ? [doc.apiInline.map((l) => `- ${mdCode(l)}`).join("\n")] : [])] : [];
  // The registry body is the accessibility notes; without one, the CSS header's.
  const derived = (doc?.a11y ?? []).flatMap(sentences).map(withoutUrls).filter((s) => s.split(/\s+/).length > 3 && !/[<>]/.test(s));
  const a11y = !p.available ? "" : p.body ? rewriteRepoLinks(p.body, model) : derived.map((s) => `- ${commentMd(s)}`).join("\n");

  // CSS header URLs, less those the page already links (standards, specs, the accessibility notes).
  const known = new Set([...p.standards, ...p.specs].map((s) => s.url));
  const fromCss = (doc?.urls ?? []).filter((u) => !known.has(u) && !p.body.includes(`(${u})`)).map((url) => ({ label: specName(url), url }));
  const specs = [...p.standards, ...p.specs, ...fromCss];

  const seeAlso = [
    level ? `[${level.title}](site:${level.level}/index.html)` : `[Patterns](site:patterns/index.html)`,
    ...(p.available ? [`Source: ${[...p.cssPaths, ...p.examplePaths].map((s) => `[\`${s}\`](${BLOB_URL}${s})`).join(", ")}`] : []),
    ...demosLine(model, p.sitePath),
  ];
  blocks.push(
    ...referenceBlocks({
      live: p.available ? liveExampleBlocks(model, p.snippets) : [],
      apiTitle: "Attributes",
      api: api.join("\n\n"),
      choices: [],
      labelled: doc?.blocks ?? [],
      keyboard: p.available ? keyboardMd(p) : "",
      a11y,
      specs: specs.length ? specListMd(specs) : "None: no native element or WAI-ARIA APG pattern covers this.",
      seeAlso,
    }),
  );

  return {
    path: p.sitePath,
    // Listed with the elements of its level: a molecule under Molecules, a layout under Layout.
    section: /** @type {Section} */ (p.level),
    navNote: patternNavNote(p),
    title: p.title,
    heading: p.title,
    description: plainMd(p.summary),
    source: edit(p.contentPath),
    blocks,
    snippets: p.available ? p.snippets : [],
    diagram,
  };
}

/** @param {Model} model @returns {Page} */
function guidesIndex(model) {
  return {
    path: "guides/index.html",
    inFull: false,
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
    inFull: false,
    section: "guides",
    title: g.title,
    heading: g.title,
    description: plainMd(g.summary),
    source: edit(g.contentPath),
    blocks: [md(rewriteRepoLinks(expandGuide(model, g), model))],
  };
}
