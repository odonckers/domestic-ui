// @ts-check
/*
 * Page templates: the HTML document around each page, and its Markdown twin.
 *
 * Accessibility notes (WCAG 2.2 AA):
 * - The skip link is the first focusable element (2.4.1 Bypass Blocks).
 *   It reuses the .visually-hidden utility, which shows it on focus.
 * - <main tabindex="-1"> so following the skip link moves focus there,
 *   not only the sequential focus starting point.
 * - One <h1> per page; Markdown headings start at h2.
 * - Code blocks wrap instead of scrolling (site.css), so no <pre> needs
 *   tabindex or a name. A focusable <pre> would need an accessible name,
 *   which ARIA 1.2 prohibits on its generic role.
 * - Visible focus, color-scheme and forced colors come from the base CSS.
 */
import { markdownToHtml, uniqueId } from "./markdown.mjs";
import { SECTIONS } from "./pages.mjs";
import { REPO_URL, SITE_URL, BLOB_URL, escapeHtml, relativeUrl } from "./util.mjs";

/** @typedef {import("./pages.mjs").Page} Page */

/**
 * @param {Page} page
 * @param {Page[]} pages all pages, for the section navigation
 */
export function renderHtml(page, pages) {
  const link = (/** @type {string} */ target) => relativeUrl(page.path, target);
  const resolveLink = (/** @type {string} */ href) => (href.startsWith("site:") ? link(href.slice(5)) : href);
  const ids = new Set(["main"]);
  const ctx = {
    link,
    heading: (/** @type {number} */ level, /** @type {string} */ text) => `<h${level} id="${uniqueId(text, ids)}">${escapeHtml(text)}</h${level}>`,
  };
  const body = page.blocks.map((b) => (b.html ? b.html(ctx) : markdownToHtml(b.md, { resolveLink, ids, caption: page.heading }))).join("\n");

  const nav = SECTIONS.map(({ section, path, title }) => {
    const current = page.path === path ? ' aria-current="page"' : page.section === section ? ' aria-current="true"' : "";
    return `          <li><a href="${link(path)}"${current}>${escapeHtml(title)}</a></li>`;
  }).join("\n");

  const siblings = page.section === "home" || page.section === "examples" ? [] : pages.filter((p) => p.section === page.section);
  const sectionTitle = SECTIONS.find((s) => s.section === page.section)?.title ?? "";
  const item = (/** @type {Page} */ p, /** @type {string} */ indent) =>
    `${indent}<li><a href="${link(p.path)}"${p.path === page.path ? ' aria-current="page"' : ""}>${escapeHtml(p.path.endsWith("index.html") ? `All ${sectionTitle.toLowerCase()}` : p.title)}</a></li>`;
  // Pages with a `group` are listed under that label as a nested list, in page order.
  /** @type {string[]} */
  const items = [];
  for (let i = 0; i < siblings.length; ) {
    const group = siblings[i].group;
    if (!group) {
      items.push(item(siblings[i++], "          "));
      continue;
    }
    const members = [];
    while (i < siblings.length && siblings[i].group === group) members.push(siblings[i++]);
    items.push(
      `          <li>\n            <span class="section-nav-group">${escapeHtml(group)}</span>\n            <ul class="stack">\n${members.map((p) => item(p, "              ")).join("\n")}\n            </ul>\n          </li>`,
    );
  }
  const sidebar = siblings.length
    ? `
      <nav class="section-nav" aria-label="${escapeHtml(sectionTitle)}">
        <ul class="stack">
${items.join("\n")}
        </ul>
      </nav>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(page.title)} · domestic-ui docs</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <link rel="stylesheet" href="${link("css/domestic.css")}">
    <link rel="stylesheet" href="${link("site.css")}">
    <link rel="alternate" type="text/markdown" href="${link(page.path.replace(/\.html$/, ".md"))}">
  </head>
  <body>
    <a class="skip-link visually-hidden" href="#main">Skip to content</a>

    <header class="site-header cluster">
      <p class="site-name"><a href="${link("index.html")}">domestic-ui</a></p>
      <nav aria-label="Docs">
        <ul class="cluster">
${nav}
        </ul>
      </nav>
    </header>

    <div class="site-body">${sidebar}
      <main id="main" tabindex="-1">
<h1>${escapeHtml(page.heading)}</h1>
${body}
      </main>
    </div>

    <footer class="site-footer">
      <p><small>domestic-ui is <a href="${BLOB_URL}LICENSE">MIT licensed</a>. <a href="${REPO_URL}">Source on GitHub</a>. <a href="${escapeHtml(page.source.href)}">${escapeHtml(page.source.label)}</a>. <a href="${link("llms.txt")}">llms.txt</a></small></p>
    </footer>
  </body>
</html>
`;
}

/**
 * Resolve "site:" links to absolute URLs. Links to docs pages point at
 * their Markdown twin when `twins` is given (for llms files), else at HTML.
 * @param {string} md
 * @param {Set<string>} [twins] site paths of pages that have a .md twin
 */
export function resolveSiteLinks(md, twins) {
  return md.replace(/\]\(site:([^)\s]*)\)/g, (_, target) => {
    const [path, hash = ""] = target.split(/(?=#)/);
    const url = twins?.has(path) ? path.replace(/\.html$/, ".md") : path;
    return `](${SITE_URL}${url}${hash})`;
  });
}

/**
 * The Markdown twin of a page: its title, then every block's Markdown.
 * @param {Page} page
 * @param {Set<string>} twins
 */
export function renderMarkdown(page, twins) {
  const parts = [`# ${page.heading}`, ...page.blocks.map((b) => b.md)];
  return `${resolveSiteLinks(parts.join("\n\n"), twins)}\n`;
}
