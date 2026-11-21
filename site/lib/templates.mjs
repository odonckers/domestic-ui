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
 * - One navigation: the Docs sidebar (./nav.mjs), a native <details>
 *   disclosure on narrow screens, open by default so it works without
 *   JavaScript.
 * - Code blocks wrap instead of scrolling (site.css), so no <pre> needs
 *   tabindex or a name. A focusable <pre> would need an accessible name,
 *   which ARIA 1.2 prohibits on its generic role. Wide tables scroll in a
 *   named, focusable [data-scroll="inline"] region instead.
 * - Visible focus, color-scheme and forced colors come from the base CSS.
 */
import { markdownToHtml, uniqueId } from "./markdown.mjs";
import { renderNav } from "./nav.mjs";
import { REPO_URL, SITE_URL, BLOB_URL, escapeHtml, relativeUrl } from "./util.mjs";

/** @typedef {import("./pages.mjs").Page} Page */

/**
 * @param {Page} page
 * @param {ReturnType<typeof import("./nav.mjs").navTree>} tree the sidebar
 */
export function renderHtml(page, tree) {
  const link = (/** @type {string} */ target) => relativeUrl(page.path, target);
  const resolveLink = (/** @type {string} */ href) => (href.startsWith("site:") ? link(href.slice(5)) : href);
  const ids = new Set(["main"]);
  const ctx = {
    link,
    heading: (/** @type {number} */ level, /** @type {string} */ text) => `<h${level} id="${uniqueId(text, ids)}">${escapeHtml(text)}</h${level}>`,
  };
  const body = page.blocks.map((b) => (b.html ? b.html(ctx) : markdownToHtml(b.md, { resolveLink, ids, caption: page.heading }))).join("\n");

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
    <script src="${link("site.js")}" defer></script>
  </head>
  <body>
    <a class="skip-link visually-hidden" href="#main">Skip to content</a>

    <header class="site-header">
      <p class="site-name"><a href="${link("index.html")}">domestic-ui</a></p>
    </header>

    <div class="site-body">
      ${renderNav(page, tree, link)}
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
 * @param {{ full?: boolean }} [options] full: for llms-full.txt, without the blocks marked inFull: false
 */
export function renderMarkdown(page, twins, { full = false } = {}) {
  const parts = [`# ${page.heading}`, ...page.blocks.filter((b) => !full || b.inFull !== false).map((b) => b.md).filter(Boolean)];
  return `${resolveSiteLinks(parts.join("\n\n"), twins)}\n`;
}
