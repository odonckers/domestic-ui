// @ts-check
/*
 * The Docs navigation, used three ways on every page:
 *
 * - App bar: the top sections (TOP), a data-nav="horizontal" list of links
 *   (css/components/molecules/nav.css), aria-current on the current one.
 * - Sidebar: the entries (NAV), a data-nav="vertical" list. An entry with
 *   pages is a native <details> group, the APG Disclosure Navigation pattern
 *   (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/):
 *   only the group that holds the current page has open in the markup, so it
 *   is right without JavaScript. Site links, not an ARIA menu.
 * - Wayfinding: a breadcrumb (breadcrumb.css) and previous and next links,
 *   in sidebar order.
 *
 * Each entry lists the pages of its sections, in page order (see
 * buildPages()). To add a page, give it one of the sections below; it
 * appears under that entry. To add an entry, add it here (and a section to
 * Page["section"]).
 */
import { escapeHtml } from "./util.mjs";

/**
 * @typedef {import("./pages.mjs").Page} Page
 * @typedef {import("./pages.mjs").Section} Section
 * @typedef {{ title: string, path: string, sections: readonly Section[], top: string }} NavEntry
 * @typedef {{ title: string, path: string }} TopSection
 */

/** The app bar's sections, in order. Each links its first entry's page. @type {readonly TopSection[]} */
export const TOP = [
  { title: "Get started", path: "index.html" },
  { title: "Foundations", path: "principles/index.html" },
  { title: "Components", path: "atoms/index.html" },
  { title: "Patterns & guides", path: "patterns/index.html" },
  { title: "Demos", path: "demos.html" },
];

/** @type {readonly NavEntry[]} */
export const NAV = [
  { title: "Getting started", path: "index.html", sections: ["home"], top: "Get started" },
  { title: "Principles", path: "principles/index.html", sections: ["principles"], top: "Foundations" },
  { title: "Tokens", path: "tokens/index.html", sections: ["tokens"], top: "Foundations" },
  { title: "Base", path: "components/base.html", sections: ["base"], top: "Foundations" },
  { title: "Layout", path: "layouts/index.html", sections: ["layouts"], top: "Foundations" },
  { title: "Atoms", path: "atoms/index.html", sections: ["atoms"], top: "Components" },
  { title: "Molecules", path: "molecules/index.html", sections: ["molecules"], top: "Components" },
  { title: "Organisms", path: "organisms/index.html", sections: ["organisms"], top: "Components" },
  { title: "Patterns", path: "patterns/index.html", sections: ["patterns"], top: "Patterns & guides" },
  { title: "Guides", path: "guides/index.html", sections: ["guides"], top: "Patterns & guides" },
  { title: "Demos", path: "demos.html", sections: ["demos"], top: "Demos" },
  { title: "Contributing", path: "contributing.html", sections: ["contributing"], top: "Get started" },
  { title: "Changelog", path: "changelog.html", sections: ["changelog"], top: "Get started" },
];

/**
 * Sidebar link text, where a page's title is not the element's name: named
 * after the element or attribute, singular. Titles (h1, <title>) keep the
 * group README's or registry's wording.
 */
export const NAV_LABELS = /** @type {Record<string, string>} */ ({
  "components/atoms/text.html": "Text",
  "components/atoms/link.html": "Link",
  "components/atoms/button.html": "Button",
  "components/atoms/controls.html": "Controls",
  "patterns/alerts.html": "Alert",
  "patterns/density.html": "Density",
});

/** A page's sidebar link text. @param {Page} page */
export const navLabel = (page) => NAV_LABELS[page.path] ?? page.navLabel ?? page.title;

/** The entry a page belongs to. @param {Page} page */
export const navEntryOf = (page) => NAV.find((e) => e.sections.includes(page.section));

/**
 * The sidebar's tree: each entry with its child links, in page order.
 * Example pages are not listed: each snippet lives on its element's page.
 * @param {Page[]} pages
 */
export function navTree(pages) {
  return NAV.map((entry) => ({
    ...entry,
    children: pages.filter((p) => entry.sections.includes(p.section) && p.path !== entry.path).map((p) => ({ path: p.path, label: navLabel(p), note: p.navNote ?? "" })),
  }));
}

/** @typedef {ReturnType<typeof navTree>} NavTree */

/** Every sidebar link in order: each entry's page, then its children. @param {NavTree} tree */
export const navOrder = (tree) => tree.flatMap((e) => [{ path: e.path, label: e.title }, ...e.children.map((c) => ({ path: c.path, label: c.label }))]);

/** The sidebar link text of an entry's own page inside its group. @param {NavEntry} entry */
export const overviewLabel = (entry) => `${entry.title} overview`;

/**
 * The sidebar HTML for one page: <nav id="docs-nav">, the app shell's
 * primary sidebar. Exactly one link has aria-current="page"; only the
 * group that holds it is open.
 * @param {Page} page
 * @param {NavTree} tree
 * @param {(target: string) => string} link
 */
export function renderNav(page, tree, link) {
  const a = (/** @type {string} */ path, /** @type {string} */ label, /** @type {string} */ note) => {
    const current = path === page.path ? ' aria-current="page"' : "";
    const extra = note ? ` <span class="docs-nav-note">(${escapeHtml(note)})</span>` : "";
    return `<a href="${escapeHtml(link(path))}"${current}>${escapeHtml(label)}${extra}</a>`;
  };
  const entries = tree.map((e) => {
    if (!e.children.length) return `            <li>${a(e.path, e.title, "")}</li>`;
    const here = e.path === page.path || e.children.some((c) => c.path === page.path);
    const links = [a(e.path, overviewLabel(e), ""), ...e.children.map((c) => a(c.path, c.label, c.note))];
    return `            <li>
              <details${here ? " open" : ""}>
                <summary>${escapeHtml(e.title)}</summary>
                <ul>
${links.map((l) => `                  <li>${l}</li>`).join("\n")}
                </ul>
              </details>
            </li>`;
  });
  return `<nav id="docs-nav" aria-label="Docs" data-nav="vertical">
          <ul>
${entries.join("\n")}
          </ul>
        </nav>`;
}

/**
 * The app bar's section links. The current section's link has
 * aria-current: "page" on its own page, "true" on the pages under it.
 * @param {Page} page
 * @param {(target: string) => string} link
 */
export function renderSections(page, link) {
  const top = navEntryOf(page)?.top;
  const items = TOP.map((s) => {
    const current = s.title === top ? (s.path === page.path ? ' aria-current="page"' : ' aria-current="true"') : "";
    return `            <li><a href="${escapeHtml(link(s.path))}"${current}>${escapeHtml(s.title)}</a></li>`;
  });
  return `<nav aria-label="Sections" data-nav="horizontal" class="docs-sections">
          <ul>
${items.join("\n")}
          </ul>
        </nav>`;
}

/**
 * The breadcrumb above the h1: top section (text: sections have no page of
 * their own), the entry's page, then the page itself with aria-current.
 * Empty on the home page.
 * @param {Page} page
 * @param {(target: string) => string} link
 */
export function renderBreadcrumb(page, link) {
  const entry = navEntryOf(page);
  if (!entry || page.path === "index.html") return "";
  const items = [`<li><span>${escapeHtml(entry.top)}</span></li>`];
  if (entry.path !== page.path) items.push(`<li><a href="${escapeHtml(link(entry.path))}">${escapeHtml(entry.title)}</a></li>`);
  items.push(`<li><a href="${escapeHtml(link(page.path))}" aria-current="page">${escapeHtml(navLabel(page))}</a></li>`);
  return `<nav aria-label="Breadcrumb" data-breadcrumb>
<ol>
${items.join("\n")}
</ol>
</nav>`;
}

/**
 * Previous and next links in sidebar order, for the footer.
 * @param {Page} page
 * @param {NavTree} tree
 * @param {(target: string) => string} link
 */
export function renderPrevNext(page, tree, link) {
  const order = navOrder(tree);
  const i = order.findIndex((o) => o.path === page.path);
  if (i < 0) return "";
  const prev = order[i - 1];
  const next = order[i + 1];
  const item = (/** @type {{ path: string, label: string } | undefined} */ o, /** @type {"prev" | "next"} */ rel) =>
    o ? `<li><a href="${escapeHtml(link(o.path))}" rel="${rel}">${rel === "prev" ? "Previous" : "Next"}: ${escapeHtml(o.label)}</a></li>` : "";
  return `<nav aria-label="Previous and next" data-pagination>
<ul>
${[item(prev, "prev"), item(next, "next")].filter(Boolean).join("\n")}
</ul>
</nav>`;
}
