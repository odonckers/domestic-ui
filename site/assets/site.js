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
 * - The theme menu in the app bar is hidden without JavaScript (the default
 *   look shows). Here it is shown; a choice sets data-theme on :root (every
 *   theme file is already linked from this origin) and is saved in
 *   localStorage; an inline script in <head> restores it before first paint.
 *   Changing it moves no focus (WCAG 3.2.2).
 * - The Themes page's radio group applies a theme to the preview frame only.
 * - Search: the app bar's Search button is hidden without JavaScript. Here it
 *   is shown; it opens a modal <dialog> (command="show-modal") holding a
 *   <dui-combobox>. On first open the page fetches search-index.json and
 *   makes one option per page and per heading; accepting one goes there.
 *   See explainers/search-dialog.md.
 * One network request, to this site's own search-index.json, on first search.
 */

const THEME_KEY = "dui-docs-theme";
const themeMenu = document.querySelector("[data-docs-theme]");
const themeSelect = document.getElementById("docs-theme-select");
if (themeMenu instanceof HTMLElement && themeSelect instanceof HTMLSelectElement) {
  const known = [...themeSelect.options].map((o) => o.value);
  const current = document.documentElement.getAttribute("data-theme") ?? "";
  themeSelect.value = known.includes(current) ? current : "";
  themeMenu.hidden = false;
  themeSelect.addEventListener("change", () => {
    const theme = themeSelect.value;
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
    try {
      if (theme) localStorage.setItem(THEME_KEY, theme);
      else localStorage.removeItem(THEME_KEY);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  });
}

const picker = document.querySelector("[data-theme-picker]");
const preview = document.querySelector('iframe[title="Live example: Theme preview"]');
if (picker instanceof HTMLFieldSetElement && preview instanceof HTMLIFrameElement) {
  const apply = () => {
    const checked = picker.querySelector("input:checked");
    const theme = checked instanceof HTMLInputElement ? checked.value : "";
    const root = preview.contentDocument?.documentElement;
    if (!root) return;
    if (theme) root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
  };
  picker.hidden = false;
  picker.addEventListener("change", apply);
  preview.addEventListener("load", apply);
  // The frame may have loaded before this module ran.
  if (preview.contentDocument?.readyState === "complete") apply();
}

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
  // Its scrollport: inside the border, above any horizontal scrollbar.
  const top = Math.max(box.top + scroller.clientTop, 0);
  const bottom = Math.min(box.top + scroller.clientTop + scroller.clientHeight, window.innerHeight);
  const r = current.getBoundingClientRect();
  // Whole pixels, rounded away from the link, so a fractional offset never leaves it clipped.
  if (r.top < top) scroller.scrollTop -= Math.ceil(top - r.top);
  else if (r.bottom > bottom) scroller.scrollTop += Math.ceil(r.bottom - bottom);
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

/*
 * Search dialog. The index is fetched once, on first open, from the URL the
 * template wrote relative to this page, so it works at /_site/ locally and
 * at /domestic-ui/ on GitHub Pages. Each page gives an option named by its
 * title and each heading one named "Page › Heading"; the hint is the
 * page's sidebar entry. Our choice: one flat list filtered by the
 * combobox's "contains" match, with every page before any heading and each
 * group in sidebar order, so a page whose title matches comes first; no
 * other ranking.
 */
const searchSlot = document.querySelector("[data-docs-search]");
const searchDialog = document.getElementById("docs-search-dialog");
const searchCombobox = searchDialog?.querySelector("dui-combobox");
const searchInput = document.getElementById("docs-search-input");
if (searchSlot instanceof HTMLElement && searchDialog instanceof HTMLDialogElement && searchCombobox && searchInput instanceof HTMLInputElement) {
  const opener = searchSlot.querySelector("button");
  const empty = searchDialog.querySelector("[data-search-empty]");
  const loadStatus = searchDialog.querySelector("[data-search-load]");
  /** @type {Map<string, URL>} option value -> destination */
  const targets = new Map();
  /** @type {Promise<void> | null} */
  let loading = null;

  const load = () => {
    loading ??= (async () => {
      const indexUrl = new URL(searchDialog.dataset.searchIndex ?? "search-index.json", location.href);
      try {
        const response = await fetch(indexUrl);
        if (!response.ok) throw new Error(String(response.status));
        /** @type {{ title: string, url: string, level: string, headings: { text: string, id: string }[] }[]} */
        const records = await response.json();
        /** @type {{ value: string, label: string }[]} */
        const options = [];
        const add = (/** @type {string} */ value, /** @type {string} */ label, /** @type {URL} */ url) => {
          if (targets.has(value)) return; // first wins: a repeated heading name keeps its first section
          targets.set(value, url);
          options.push({ value, label });
        };
        for (const r of records) add(r.title, r.level, new URL(r.url, indexUrl));
        for (const r of records) {
          for (const h of r.headings) add(`${r.title} › ${h.text}`, r.level, new URL(`#${encodeURIComponent(h.id)}`, new URL(r.url, indexUrl)));
        }
        await customElements.whenDefined("dui-combobox");
        /** @type {any} */ (searchCombobox).setOptions(options);
        if (loadStatus) loadStatus.textContent = "";
      } catch {
        loading = null; // try again on the next open
        if (loadStatus) loadStatus.textContent = "Search is not available right now. Use the Docs sidebar instead.";
      }
    })();
    return loading;
  };

  // The empty state: shown, not announced (the combobox's status region already says "No results").
  const showEmpty = () => {
    if (!(empty instanceof HTMLElement)) return;
    const query = searchInput.value.trim();
    const none = Boolean(query) && targets.size > 0 && searchCombobox.querySelectorAll('[role="option"]').length === 0;
    empty.hidden = !none;
    empty.textContent = none ? `No results for “${query}”` : "";
  };
  searchInput.addEventListener("input", () => queueMicrotask(showEmpty));

  // Accepting an option (Enter or a click) fires change with its value.
  searchInput.addEventListener("change", (event) => {
    if (event.isTrusted) return; // the native change on blur after typing, not an accepted option
    const target = targets.get(searchInput.value);
    if (!target) return;
    searchDialog.close();
    const samePage = target.pathname === location.pathname;
    location.assign(target);
    // A heading on this page: the URL only changes its fragment, so move focus there too (WCAG 2.4.3).
    if (samePage && target.hash) {
      const heading = document.getElementById(decodeURIComponent(target.hash.slice(1)));
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  });

  searchDialog.addEventListener("toggle", (event) => {
    if (/** @type {ToggleEvent} */ (event).newState === "open") load();
  });
  opener?.addEventListener("click", () => {
    load();
    // Invoker commands not supported: open the dialog from here.
    if (!("command" in HTMLButtonElement.prototype) && !searchDialog.open) searchDialog.showModal();
  });
  searchSlot.hidden = false;
}
