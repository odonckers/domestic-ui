// @ts-check
/*
 * Page templates: the HTML document around each page, and its Markdown twin.
 *
 * Accessibility notes (WCAG 2.2 AA):
 * - The frame is the app shell (css/layout/app-shell.css,
 *   web-components/dui-app-shell.js): landmarks in source order, app bar
 *   <header>, the Docs <nav> sidebar, <main>, an optional "On this page"
 *   <aside>, <footer>. Narrow screens get the sidebar as a modal drawer from
 *   the Menu button; without JavaScript it stacks above main.
 * - The skip link comes before the shell and is the first focusable
 *   element (2.4.1 Bypass Blocks). It reuses the .visually-hidden utility,
 *   which shows it on focus.
 * - <main tabindex="-1"> so following the skip link moves focus there,
 *   not only the sequential focus starting point.
 * - One <h1> per page; Markdown headings start at h2.
 * - Wide tables and code blocks scroll in a named, focusable
 *   [data-scroll="inline"] region (site.css).
 * - Visible focus, color-scheme and forced colors come from the base CSS.
 */
import { markdownToHtml, uniqueId } from "./markdown.mjs";
import { renderBreadcrumb, renderNav, renderPrevNext, renderSections } from "./nav.mjs";
import { REPO_URL, SITE_URL, BLOB_URL, escapeHtml, relativeUrl } from "./util.mjs";

/** @typedef {import("./pages.mjs").Page} Page */

/** The data-scroll="inline" API is an element with role="region" (css/layout/scroll.css), which html-validate would have be a <section>. */
const REGIONS_NOTE = '<!-- [html-validate-disable-block prefer-native-element: data-scroll="inline" regions (code blocks, wide tables) are elements with role="region", the css/layout/scroll.css API] -->';

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

  const toc = page.wide ? "" : tocHtml(body);

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
    <script type="module" src="${link("web-components/dui-app-shell.js")}"></script>
    <script src="${link("site.js")}" defer></script>
    <script src="${link("highlight.js")}" defer></script>
  </head>
  <body>
    <a class="skip-link visually-hidden" href="#main">Skip to content</a>

    <dui-app-shell data-app-shell class="docs-shell">
      <header>
        <button type="button" aria-controls="docs-nav" aria-expanded="true" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
          Menu
        </button>
        <a class="docs-name" href="${link("index.html")}">domestic-ui</a>
        ${renderSections(page, link)}
        <!-- Slot for the site search (M4): search-index.json. Empty and hidden until then. -->
        <div class="docs-search" data-docs-search hidden></div>
        <a class="docs-github" href="${REPO_URL}">GitHub</a>
      </header>
      ${renderNav(page, tree, link)}
      <main id="main" tabindex="-1">
        <article class="docs-content"${page.wide ? " data-wide" : ""}>
${/role="region"/.test(body) ? `${REGIONS_NOTE}\n` : ""}${renderBreadcrumb(page, link)}
<h1>${escapeHtml(page.heading)}</h1>
${body}
        </article>
      </main>${toc}
      <footer>
${renderPrevNext(page, tree, link)}
        <p><small>domestic-ui is <a href="${BLOB_URL}LICENSE">MIT licensed</a>. <a href="${REPO_URL}">Source on GitHub</a>. <a href="${escapeHtml(page.source.href)}">${escapeHtml(page.source.label)}</a>. <a href="${link("llms.txt")}">llms.txt</a></small></p>
      </footer>
    </dui-app-shell>
  </body>
</html>
`;
}

/**
 * The "On this page" auxiliary sidebar: a link to each h2 of the body, or
 * "" when there are fewer than two.
 * @param {string} body
 */
function tocHtml(body) {
  const h2s = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map((m) => ({ id: m[1], text: m[2].replace(/<[^>]*>/g, "") }));
  if (h2s.length < 2) return "";
  return `
      <aside class="docs-toc" aria-labelledby="docs-toc-title">
        <h2 id="docs-toc-title">On this page</h2>
        <ul>
${h2s.map((h) => `          <li><a href="#${h.id}">${h.text}</a></li>`).join("\n")}
        </ul>
      </aside>`;
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
