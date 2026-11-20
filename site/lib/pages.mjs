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
import { COMPONENT_GROUPS } from "./discovery.mjs";
import { inline, plainText, shiftHeadings, tokenize } from "./markdown.mjs";
import { BLOB_URL, REPO_URL, escapeHtml, escapeMdCell, fence, firstSentence, mdCode, slugify } from "./util.mjs";

/**
 * @typedef {import("./discovery.mjs").Model} Model
 * @typedef {import("./discovery.mjs").Component} Component
 * @typedef {import("./discovery.mjs").Snippet} Snippet
 * @typedef {{ link: (target: string) => string, heading: (level: number, text: string) => string }} HtmlContext
 * @typedef {{ md: string, html?: (ctx: HtmlContext) => string }} Block
 * @typedef {"home" | "principles" | "tokens" | "components" | "examples"} Section
 * @typedef {object} Page
 * @property {string} path         site path of the HTML page, e.g. "tokens/space.html"
 * @property {Section} section
 * @property {string} title        used in <title>, nav and llms.txt
 * @property {string} heading      the page's h1
 * @property {string} description  meta description and llms.txt note
 * @property {{ href: string, label: string }} source  footer link to the source
 * @property {Block[]} blocks
 * @property {Snippet[]} [snippets] copy-paste markup shown on the page, in order
 */

export const SECTIONS = /** @type {const} */ ([
  { section: "home", path: "index.html", title: "Overview" },
  { section: "principles", path: "principles/index.html", title: "Principles" },
  { section: "tokens", path: "tokens/index.html", title: "Tokens" },
  { section: "components", path: "components/index.html", title: "Components" },
  { section: "examples", path: "examples.html", title: "Examples" },
]);

const md = (/** @type {string} */ text) => ({ md: text });
const edit = (/** @type {string} */ path) => ({ href: `${REPO_URL}/edit/main/${path}`, label: "Edit this page on GitHub" });
const plainMd = (/** @type {string} */ text) => plainText(text).replace(/\s+/g, " ").trim();

/** Bare URLs in comment prose become autolinks. @param {string} text */
const autolink = (text) => text.replace(/(?<!<)(https?:\/\/[^\s<>()"']+[^\s<>()"'.,;:])/g, "<$1>");

/**
 * Comment prose to Markdown: autolink URLs, and keep characters Markdown
 * would read as emphasis or code literal.
 * @param {string} text
 */
const commentMd = (text) => autolink(text.replace(/([*_`[\]\\])/g, "\\$1"));

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
  const m = path.match(/^css\/(?:components\/)?([\w-]+)\/([\w-]+)\.css$/);
  if (m) {
    const all = [...Object.values(model.components).flat(), ...model.layout, ...model.utilities];
    const hit = all.find((c) => c.group === m[1] && c.name === m[2]);
    if (hit) return `site:${hit.sitePath}${hash}`;
  }
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

/** One-line API summary: first word of each API line. @param {Component} c */
export function apiSummary(c) {
  const lines = c.api ? c.api.split("\n").map((l) => l.trim().split(/\s{2,}/)[0]).filter(Boolean) : [];
  return [...lines, ...c.apiInline];
}

/** Every component-like page, in docs order. @param {Model} model */
export const allComponents = (model) => [model.base, ...COMPONENT_GROUPS.flatMap(({ group }) => model.components[group]), ...model.layout, ...model.utilities];

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

/** @param {Model} model @returns {Page[]} */
export function buildPages(model) {
  return [
    homePage(model),
    principlesIndex(model),
    ...model.principles.sections.map((s) => principlePage(model, s)),
    tokensIndex(model),
    ...model.tokenGroups.map((g) => tokenPage(g)),
    componentsIndex(model),
    ...allComponents(model).map((c) => componentPage(model, c)),
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
      md(`## Components\n\n${groups}`),
      md(`## Examples\n\n${model.examples.map((e) => `- [${e.title}](site:${e.path})`).join("\n")}`),
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

/** @param {Model} model */
function componentListMd(model) {
  const line = (/** @type {Component} */ c) => `- [${c.title}](site:${c.sitePath}): ${commentMd(c.summary)}`;
  const out = [`### Base elements\n\n${line(model.base)}`];
  for (const { group, title } of COMPONENT_GROUPS) out.push(`### ${title}\n\n${groupMd(model, group)}`);
  out.push(`### Layout primitives\n\n${model.layout.map(line).join("\n")}`);
  out.push(`### Utilities\n\n${model.utilities.map(line).join("\n")}`);
  return out.join("\n\n");
}

/** A group's list, or one honest sentence when it is empty. @param {Model} model @param {string} group */
export function groupMd(model, group) {
  const items = model.components[group];
  if (items.length) return items.map((c) => `- [${c.title}](site:${c.sitePath}): ${commentMd(c.summary)}`).join("\n");
  const milestone = COMPONENT_GROUPS.find((g) => g.group === group)?.milestone;
  return `Coming in ${milestone}; see the [components README](${BLOB_URL}css/components/README.md).`;
}

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
    description: "Base elements, components, layout primitives and utilities of domestic-ui, each with one class or attribute API.",
    source: edit("css/components/README.md"),
    blocks: [
      md(`Each layout primitive, utility and component has one documented class or attribute API, written in the header comment of its CSS file and tuned with custom properties ([Agent-friendly by design](site:${principleLink(model, "agent-friendly-by-design")})). Base elements need no API at all: write semantic HTML.`),
      md(componentListMd(model).replace(/^### /gm, "## ")),
    ],
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

  // API
  const api = [];
  if (c.api) api.push(fence(c.api, "text"));
  for (const line of c.apiInline) api.push(`- ${mdCode(line)}`);
  if (c.group === "base") api.unshift("No classes: write semantic HTML and the base layer styles it.");
  if (!api.length) api.push("The CSS header comment does not have an `API` block yet.");
  blocks.push(md(`## API\n\n${api.join("\n\n")}`));

  if (c.files.length) {
    const rows = c.files.map((f) => `| [${mdCode(f.path)}](${BLOB_URL}${f.path}) | ${escapeMdCell(commentMd(f.summary))} |`);
    blocks.push(md(`## Files in css/base/\n\n| File | Covers |\n| --- | --- |\n${rows.join("\n")}`));
  }

  // Live example
  if (c.examplePath) {
    const ex = /** @type {string} */ (c.examplePath);
    blocks.push({
      md: `## Live example\n\n[Open the example on its own](site:${ex})`,
      html: (ctx) =>
        `${ctx.heading(2, "Live example")}\n<iframe class="example-frame" src="${escapeHtml(ctx.link(ex))}" title="Live example: ${escapeHtml(c.title)}" loading="lazy"></iframe>\n<p><a href="${escapeHtml(ctx.link(ex))}">Open the example on its own</a></p>`,
    });
  } else {
    const used = c.usedIn.map((p) => `[${model.examples.find((e) => e.path === p)?.title ?? p}](site:${p})`);
    const usedMd = used.length ? ` These example pages use it: ${used.join(", ")}.` : "";
    blocks.push(md(`## Live example\n\nThere is no standalone example page for ${c.title.toLowerCase()} yet.${usedMd}`));
  }

  // Copy-paste markup
  const n = c.snippets.length;
  if (n) {
    const from = c.snippets[0].from;
    const intro =
      from === "css-comment"
        ? `From the \`Example\` block in [\`${c.cssPath}\`](${BLOB_URL}${c.cssPath}):`
        : from === "main"
          ? `The content of \`<main>\` in [\`${c.snippets[0].source}\`](${BLOB_URL}${c.snippets[0].source}), unchanged except for removing the common indentation:`
          : `From [\`${c.snippets[0].source}\`](${BLOB_URL}${c.snippets[0].source}), unchanged except for removing the common indentation:`;
    blocks.push(md(`## Markup\n\n${intro}`));
    c.snippets.forEach((s, i) => {
      const name = snippetName(s, i, n);
      blocks.push({
        md: `${name ? `### ${name}\n\n` : ""}${fence(s.code, "html")}`,
        html: (ctx) => `${name ? `${ctx.heading(3, name)}\n` : ""}<pre data-snippet="${escapeHtml(s.source)}"><code>${escapeHtml(s.code)}</code></pre>`,
      });
    });
  } else {
    blocks.push(md("## Markup\n\nNo markup snippet yet: there is no example page and no `Example` block in the CSS header comment."));
  }

  if (c.notes.length) blocks.push(md(`## Notes\n\n${c.notes.map(commentMd).join("\n\n")}`));

  const baseline = `[Accessibility baseline](site:${principleLink(model, "accessibility-baseline-wcag-22-aa")})`;
  const a11y = c.a11y
    ? c.a11yFromOverride
      ? rewriteRepoLinks(c.a11y, model)
      : `From the CSS header comment: ${commentMd(c.a11y)}\n\nSee also the spec links below and the ${baseline} principle.`
    : `The CSS header comment has no accessibility notes. See the spec links below and the ${baseline} principle.`;
  blocks.push(md(`## Accessibility\n\n${a11y}`));

  const specs = c.specs.length
    ? c.specs.map((s) => `- **${escapeMdCell(s.label)}**: [${s.url.replace(/^https?:\/\//, "")}](${s.url})`).join("\n")
    : "The CSS header comment links no specs.";
  blocks.push(md(`## Specs\n\n${specs}`));

  const sources = [c.group === "base" ? `[\`css/base/\`](${REPO_URL}/tree/main/css/base)` : `[\`${c.cssPath}\`](${BLOB_URL}${c.cssPath})`];
  if (c.examplePath) sources.push(`[\`${c.examplePath}\`](${BLOB_URL}${c.examplePath})`);
  if (c.overridePath) sources.push(`[\`${c.overridePath}\`](${BLOB_URL}${c.overridePath})`);
  blocks.push(md(`## Source\n\n${sources.map((s) => `- ${s}`).join("\n")}`));

  return {
    path: c.sitePath,
    section: "components",
    title: c.title,
    heading: c.title,
    description: plainMd(commentMd(c.summary)),
    source: edit(c.overridePath ?? (c.group === "base" ? (c.files[0]?.path ?? "css/base/document.css") : c.cssPath)),
    blocks,
    snippets: c.snippets,
  };
}

/** @param {Model} model @returns {Page} */
function examplesPage(model) {
  const groups = [...new Set(model.examples.map((e) => e.group))];
  const sections = groups.map((g) => {
    const items = model.examples.filter((e) => e.group === g).map((e) => `- [${e.title}](site:${e.path}) ([source](${BLOB_URL}${e.path}))`);
    const title = g ? (COMPONENT_GROUPS.find((x) => x.group === g)?.title ?? g) : "Pages";
    return `## ${title}\n\n${items.join("\n")}`;
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
