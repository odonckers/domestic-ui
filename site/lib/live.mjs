// @ts-check
/*
 * Generated pages that are not docs pages, so they are not in the sidebar,
 * search index or llms files:
 *
 * - Render pages, live/<example path>--<snippet>.html: one per snippet, the
 *   iframe source of its live example. The example's <head> (its CSS and
 *   theme styles), the snippet's text as the body, then the example's
 *   scripts. Each sits at the same directory depth as its example, so the
 *   example's relative URLs (../../css/domestic.css,
 *   ../../web-components/dui-tabs.js) work unchanged. noindex.
 * - Redirect pages at every old example URL (examples.html,
 *   examples/**\/*.html). GitHub Pages has no server redirects, so each is a
 *   static page: <meta http-equiv="refresh"> with no delay (WCAG 2.2.1 allows
 *   an instant redirect), a canonical link, noindex, and a visible link.
 */
import { SITE_URL, escapeHtml, relativeUrl } from "./util.mjs";

/** @typedef {import("./discovery.mjs").Snippet} Snippet */

/**
 * @param {Snippet} snippet
 * @param {string} exampleHtml the example page the snippet comes from
 */
export function renderPage(snippet, exampleHtml) {
  const htmlTag = exampleHtml.match(/<html\b[^>]*>/i)?.[0] ?? '<html lang="en">';
  const bodyTag = exampleHtml.match(/<body\b[^>]*>/i)?.[0] ?? "<body>";
  const title = `${snippet.name} · live example · domestic-ui`;
  const head = (exampleHtml.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "")
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>\n    <meta name="robots" content="noindex">`)
    .replace(/\n\s*<meta\s+name="description"[^>]*>/i, "");
  const end = exampleHtml.search(/<\/main>/i);
  const scripts = [...exampleHtml.slice(end < 0 ? 0 : end).matchAll(/<script\b[\s\S]*?<\/script>/gi)].map((m) => `    ${m[0]}`);
  return `<!DOCTYPE html>
${htmlTag}
  <head>${head.trimEnd()}
    <style>
      /* Render page only: room for focus rings at the frame's edges. */
      body {
        padding: var(--dui-space-m);
      }
    </style>
  </head>
  ${bodyTag}
${snippet.code}
${scripts.join("\n")}
  </body>
</html>
`;
}

/**
 * A static redirect from an old URL to a docs page.
 * @param {string} from site path of the old URL
 * @param {string} to site path of the page it moved to
 * @param {string} title that page's title
 */
export function redirectPage(from, to, title) {
  const href = escapeHtml(relativeUrl(from, to));
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0; url=${href}">
    <meta name="robots" content="noindex">
    <link rel="canonical" href="${escapeHtml(SITE_URL + to)}">
    <title>Moved: ${escapeHtml(title)} · domestic-ui docs</title>
  </head>
  <body>
    <p>This page moved to <a href="${href}">${escapeHtml(title)}</a>.</p>
  </body>
</html>
`;
}

/**
 * The Markdown twin of a redirect, for an old .md URL.
 * @param {string} to
 * @param {string} title
 */
export const redirectMarkdown = (to, title) => `# Moved\n\nThis page moved to [${title}](${SITE_URL}${to.replace(/\.html$/, ".md")}).\n`;
