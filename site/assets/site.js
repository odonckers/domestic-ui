/*
 * Docs site enhancements. Everything works without this file:
 * - The Docs sidebar (web-components/dui-app-shell.js does the drawer) opens
 *   the group of the current page in its markup. Here the current link is
 *   scrolled into view inside the sidebar.
 * - Token pages list every token. Here the filter is shown and hides rows
 *   that do not match, and groups with no match, and says how many are shown.
 * - Live examples are frames of a fixed height (site.css), loaded with the
 *   page (not lazily, so the page does not jump as you scroll). Here each is
 *   fitted to its content, and refitted when the content changes size.
 * No network requests.
 */

for (const frame of document.querySelectorAll("iframe[data-live]")) {
  if (!(frame instanceof HTMLIFrameElement)) continue;
  const fit = () => {
    const root = frame.contentDocument?.documentElement;
    const inner = frame.contentWindow?.innerHeight ?? 0;
    if (!root) return;
    // Content that overflows the frame (margins, wide or positioned children) shows in scrollHeight; content shorter than the frame, in the root's own height.
    const height = root.scrollHeight > inner ? root.scrollHeight : root.getBoundingClientRect().height;
    frame.style.blockSize = `${Math.ceil(height) + 2}px`;
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
  // The part of the sidebar on screen: below the app bar it may run past the bottom of the viewport.
  const box = scroller.getBoundingClientRect();
  const top = Math.max(box.top, 0);
  const bottom = Math.min(box.bottom, window.innerHeight);
  const r = current.getBoundingClientRect();
  if (r.top < top) scroller.scrollTop -= top - r.top;
  else if (r.bottom > bottom) scroller.scrollTop += r.bottom - bottom;
};

const docsNav = document.getElementById("docs-nav");
if (docsNav) {
  // Once the sidebar has a size: <dui-app-shell> may dock it a frame after this runs (WebKit).
  const sized = new ResizeObserver(() => {
    if (!docsNav.clientHeight) return;
    sized.disconnect();
    revealCurrent(docsNav);
  });
  sized.observe(docsNav);
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
