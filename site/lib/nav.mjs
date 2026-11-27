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
 * Page["section"]) with one of the ICONS below.
 *
 * Icons: each sidebar entry (a top-level link or group summary) starts with
 * a small decorative Lucide icon (https://lucide.dev, ISC license), pasted
 * as inline SVG the way css/components/atoms/icon.css documents it, so the
 * sections can be told apart at a glance. Pages inside a group get none.
 * Our choice: one icon per entry and no more, because an icon on every
 * link stops telling anything apart. The icons are aria-hidden; the link
 * or summary text stays the accessible name (WCAG 1.1.1).
 */
import { escapeHtml } from "./util.mjs";

/**
 * Lucide icons (lucide-static 1.81.0), as the inside of a 24x24 SVG. The
 * keys are Lucide's names. Atoms, Molecules and Organisms read as a
 * progression: one atom, a few bonded atoms (share-2), a whole network.
 */
export const ICONS = /** @type {const} */ ({
  "rocket": `<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>`,
  "compass": `<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>`,
  "palette": `<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>`,
  "type": `<path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/>`,
  "layout-panel-left": `<rect width="7" height="18" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/>`,
  "atom": `<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>`,
  "share-2": `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>`,
  "network": `<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>`,
  "code-xml": `<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>`,
  "puzzle": `<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>`,
  "book-open": `<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>`,
  "scroll-text": `<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>`,
  "app-window": `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/>`,
  "git-pull-request-arrow": `<circle cx="5" cy="6" r="3"/><path d="M5 9v12"/><circle cx="19" cy="18" r="3"/><path d="m15 9-3-3 3-3"/><path d="M12 6h5a2 2 0 0 1 2 2v7"/>`,
  "history": `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>`,
});

/**
 * A decorative sidebar icon: data-icon (icon.css) with Lucide's own
 * attributes, hidden from assistive technology.
 * @param {keyof typeof ICONS} name
 */
export const navIcon = (name) =>
  `<svg data-icon xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

/**
 * @typedef {import("./pages.mjs").Page} Page
 * @typedef {import("./pages.mjs").Section} Section
 * @typedef {{ title: string, icon: keyof typeof ICONS, path: string, sections: readonly Section[], top: string }} NavEntry
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
  { title: "Getting started", icon: "rocket", path: "index.html", sections: ["home"], top: "Get started" },
  { title: "Principles", icon: "compass", path: "principles/index.html", sections: ["principles"], top: "Foundations" },
  { title: "Tokens", icon: "palette", path: "tokens/index.html", sections: ["tokens"], top: "Foundations" },
  { title: "Base", icon: "type", path: "components/base.html", sections: ["base"], top: "Foundations" },
  { title: "Layout", icon: "layout-panel-left", path: "layouts/index.html", sections: ["layouts"], top: "Foundations" },
  { title: "Atoms", icon: "atom", path: "atoms/index.html", sections: ["atoms"], top: "Components" },
  { title: "Molecules", icon: "share-2", path: "molecules/index.html", sections: ["molecules"], top: "Components" },
  { title: "Organisms", icon: "network", path: "organisms/index.html", sections: ["organisms"], top: "Components" },
  { title: "Web components", icon: "code-xml", path: "components/web-components.html", sections: ["web-components"], top: "Components" },
  { title: "Patterns", icon: "puzzle", path: "patterns/index.html", sections: ["patterns"], top: "Patterns & guides" },
  { title: "Guides", icon: "book-open", path: "guides/index.html", sections: ["guides"], top: "Patterns & guides" },
  { title: "Explainers", icon: "scroll-text", path: "explainers/index.html", sections: ["explainers"], top: "Patterns & guides" },
  { title: "Demos", icon: "app-window", path: "demos.html", sections: ["demos"], top: "Demos" },
  { title: "Contributing", icon: "git-pull-request-arrow", path: "contributing.html", sections: ["contributing"], top: "Get started" },
  { title: "Changelog", icon: "history", path: "changelog.html", sections: ["changelog"], top: "Get started" },
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
  const a = (/** @type {string} */ path, /** @type {string} */ label, /** @type {string} */ note, icon = "") => {
    const current = path === page.path ? ' aria-current="page"' : "";
    const extra = note ? ` <span class="docs-nav-note">(${escapeHtml(note)})</span>` : "";
    return `<a href="${escapeHtml(link(path))}"${current}>${icon}${escapeHtml(label)}${extra}</a>`;
  };
  const entries = tree.map((e) => {
    if (!e.children.length) return `            <li>${a(e.path, e.title, "", navIcon(e.icon))}</li>`;
    const here = e.path === page.path || e.children.some((c) => c.path === page.path);
    const links = [a(e.path, overviewLabel(e), ""), ...e.children.map((c) => a(c.path, c.label, c.note))];
    return `            <li>
              <details${here ? " open" : ""}>
                <summary>${navIcon(e.icon)}${escapeHtml(e.title)}</summary>
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
  // The top section, unless it only repeats the page's own name ("Demos / Demos").
  const items = entry.top === navLabel(page) ? [] : [`<li><span>${escapeHtml(entry.top)}</span></li>`];
  if (entry.path !== page.path) items.push(`<li><a href="${escapeHtml(link(entry.path))}">${escapeHtml(entry.title)}</a></li>`);
  if (!items.length) return "";
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
