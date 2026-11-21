/*
 * Docs site enhancements. Everything works without this file:
 * - The Docs sidebar (web-components/dui-app-shell.js does the drawer) opens
 *   the group of the current page in its markup. Here the current link is
 *   scrolled into view inside the sidebar.
 * - Token pages list every token. Here the filter is shown and hides rows
 *   that do not match, and groups with no match, and says how many are shown.
 * - Live examples are frames of a fixed height (site.css). Here each is fitted
 *   to its content, and refitted when the content changes size.
 * No network requests.
 */

for (const frame of document.querySelectorAll("iframe[data-live]")) {
  if (!(frame instanceof HTMLIFrameElement)) continue;
  const fit = () => {
    const root = frame.contentDocument?.documentElement;
    if (root) frame.style.blockSize = `${Math.ceil(root.getBoundingClientRect().height) + 2}px`;
  };
  const watch = () => {
    const body = frame.contentDocument?.body;
    if (!body) return;
    fit();
    new ResizeObserver(fit).observe(body);
  };
  frame.addEventListener("load", watch);
  if (frame.contentDocument?.readyState === "complete" && frame.contentDocument.body?.childElementCount) watch();
}

/**
 * Scroll the current page's link into view inside its sidebar, never the
 * page: only the sidebar's own scroll position changes (the "nearest" block
 * alignment of scrollIntoView, limited to one scroll container).
 * @param {Element} scroller
 */
const revealCurrent = (scroller) => {
  const current = scroller.querySelector('a[aria-current="page"]');
  if (!(current instanceof HTMLElement) || scroller.scrollHeight <= scroller.clientHeight) return;
  const box = scroller.getBoundingClientRect();
  const r = current.getBoundingClientRect();
  if (r.top < box.top) scroller.scrollTop -= box.top - r.top;
  else if (r.bottom > box.bottom) scroller.scrollTop += r.bottom - box.bottom;
};

const docsNav = document.getElementById("docs-nav");
if (docsNav) {
  revealCurrent(docsNav);
  // In the narrow-screen drawer, the dialog is the scroll container.
  document.addEventListener("dui-app-shell-toggle", (event) => {
    const { detail } = /** @type {CustomEvent} */ (event);
    if (detail?.sidebar === docsNav && detail.expanded) {
      const dialog = docsNav.closest("dialog");
      revealCurrent(dialog ?? docsNav);
    }
  });
}

const filter = document.querySelector("[data-token-filter]");
const status = document.querySelector("[data-token-filter-status]");
const input = filter?.querySelector('input[type="search"]');
if (filter instanceof HTMLElement && input instanceof HTMLInputElement && status) {
  const groups = [...document.querySelectorAll("[data-token-group]")];
  const rows = groups.flatMap((g) => [...g.querySelectorAll("tbody tr")].map((tr) => ({ tr, text: (tr.textContent ?? "").toLowerCase() })));
  let timer = 0;

  const apply = () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    for (const row of rows) {
      const match = !query || row.text.includes(query);
      row.tr.hidden = !match;
      if (match) shown++;
    }
    for (const group of groups) {
      if (group instanceof HTMLElement) group.hidden = !group.querySelector("tbody tr:not([hidden])");
    }
    // Polite live region: announced after typing pauses, not on every key.
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      status.textContent = `${shown} ${shown === 1 ? "token" : "tokens"} shown`;
    }, 300);
  };

  input.addEventListener("input", apply);
  filter.hidden = false;
}
