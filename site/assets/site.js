/*
 * Docs site enhancements. Everything works without this file:
 * - The Docs menu is a native <details open>, so it is open at every width.
 *   Here it closes on narrow viewports on load, and stays open on wide ones,
 *   where it is a sidebar and its <summary> is hidden (site.css).
 * - Token pages list every token. Here the filter is shown and hides rows
 *   that do not match, and groups with no match, and says how many are shown.
 * No network requests.
 */

// Keep in sync with the wide-screen @media query in site.css.
const WIDE = "(min-width: 64em)";

const menu = document.querySelector("[data-docs-menu]");
if (menu instanceof HTMLDetailsElement) {
  const wide = window.matchMedia(WIDE);
  menu.open = wide.matches;
  wide.addEventListener("change", () => {
    menu.open = wide.matches;
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
