// @ts-check
/*
 * The Docs sidebar: one navigation for the whole site. Its top-level
 * entries are fixed, in this order; each lists the pages of its sections,
 * in page order (see buildPages()), plus a few links to example pages.
 *
 * To add a page, give it one of the sections below; it appears under that
 * entry. To add an entry, add it here (and a section to Page["section"]).
 */
import { escapeHtml } from "./util.mjs";

/**
 * @typedef {import("./pages.mjs").Page} Page
 * @typedef {import("./pages.mjs").Section} Section
 * @typedef {{ title: string, path: string, sections: readonly Section[] }} NavEntry
 */

/** @type {readonly NavEntry[]} */
export const NAV = [
  { title: "Getting started", path: "index.html", sections: ["home"] },
  { title: "Principles", path: "principles/index.html", sections: ["principles"] },
  { title: "Tokens", path: "tokens/index.html", sections: ["tokens"] },
  { title: "Base", path: "components/base.html", sections: ["base"] },
  { title: "Layout", path: "layouts/index.html", sections: ["layouts"] },
  { title: "Atoms", path: "atoms/index.html", sections: ["atoms"] },
  { title: "Molecules", path: "molecules/index.html", sections: ["molecules"] },
  { title: "Organisms", path: "organisms/index.html", sections: ["organisms"] },
  { title: "Patterns and guides", path: "patterns/index.html", sections: ["patterns", "guides"] },
  { title: "Demos", path: "demos.html", sections: ["demos"] },
  { title: "Contributing", path: "contributing.html", sections: ["contributing"] },
  { title: "Changelog", path: "changelog.html", sections: ["changelog"] },
];

/** The entry a page belongs to. @param {Page} page */
export const navEntryOf = (page) => NAV.find((e) => e.sections.includes(page.section));

/**
 * Where an example page is listed in the sidebar: pages at the top of
 * examples/ (base, theming) under Base, a group's showcase
 * (examples/<group>/index.html) under that level. Other example pages are
 * reached from their component page and from examples.html.
 * @param {{ group: string, showcase: boolean }} e
 * @returns {Section | null}
 */
export function exampleNavSection(e) {
  if (!e.group) return "base";
  if (!e.showcase) return null;
  const section = e.group === "layout" ? "layouts" : e.group;
  return NAV.some((n) => n.sections.includes(/** @type {Section} */ (section))) ? /** @type {Section} */ (section) : null;
}

/**
 * The sidebar's tree: each entry with its child links, in page order,
 * then the example pages listed under it.
 * @param {Page[]} pages
 * @param {{ path: string, title: string, group: string, showcase: boolean }[]} examples
 */
export function navTree(pages, examples) {
  return NAV.map((entry) => ({
    ...entry,
    children: [
      ...pages.filter((p) => entry.sections.includes(p.section) && p.path !== entry.path).map((p) => ({ path: p.path, label: p.navLabel ?? p.title, note: p.navNote ?? "" })),
      ...examples
        .filter((e) => {
          const s = exampleNavSection(e);
          return s !== null && entry.sections.includes(s);
        })
        .map((e) => ({ path: e.path, label: e.title, note: "example page" })),
    ],
  }));
}

/**
 * The sidebar HTML for one page. Exactly one link has aria-current="page";
 * the entry that holds it gets data-current-section for a visible marker.
 * Native <details open>: without JavaScript the menu is open at every
 * width; site.js closes it on narrow viewports on load.
 * https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element
 * @param {Page} page
 * @param {ReturnType<typeof navTree>} tree
 * @param {(target: string) => string} link
 */
export function renderNav(page, tree, link) {
  const a = (/** @type {string} */ path, /** @type {string} */ label, /** @type {string} */ note) => {
    const current = path === page.path ? ' aria-current="page"' : "";
    const extra = note ? ` <span class="docs-nav-note">(${escapeHtml(note)})</span>` : "";
    return `<a href="${escapeHtml(link(path))}"${current}>${escapeHtml(label)}${extra}</a>`;
  };
  const entries = tree.map((e) => {
    const here = e.path === page.path || e.children.some((c) => c.path === page.path);
    const children = e.children.length
      ? `\n            <ul>\n${e.children.map((c) => `              <li>${a(c.path, c.label, c.note)}</li>`).join("\n")}\n            </ul>\n          `
      : "";
    return `          <li${here ? " data-current-section" : ""}>${a(e.path, e.title, "")}${children}</li>`;
  });
  return `<details class="docs-menu" open data-docs-menu>
        <summary>Docs menu</summary>
        <nav class="docs-nav" aria-label="Docs">
          <ul>
${entries.join("\n")}
          </ul>
        </nav>
      </details>`;
}
