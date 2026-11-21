/*
 * <dui-tabs>: APG Tabs on top of in-page links and sections.
 *
 * Why script: HTML has no tabs element. Showing one panel at a time,
 * roving tabindex and arrow-key navigation between tabs (APG Tabs pattern)
 * cannot be done with HTML or CSS alone.
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * Progressive enhancement: write a <nav aria-label> with a list of
 * in-page links, followed by the <section id> panels they point at. With
 * JavaScript off every section shows with its heading, and the links work
 * as a table of contents. When this module loads, the element adds the
 * ARIA roles and keyboard behavior. Light DOM, no dependencies, no build.
 *
 * API
 *   <dui-tabs>                  the wrapper
 *   activation="manual"         arrows move focus only; Enter or Space selects
 *                               (default: automatic, selection follows focus)
 *   aria-current="true"         on one link: selected on load. Otherwise the
 *                               tab whose panel id is the URL fragment, else
 *                               the first tab. Not aria-selected: that is not
 *                               allowed on a link, and the links stay links
 *                               without JavaScript.
 *                               https://w3c.github.io/aria/#aria-current
 *   element.select(idOrTab)     selects a tab by panel id or tab element
 *   element.selectedTab         the selected tab element (read only)
 *
 * What the upgrade does
 *   <nav> gets role="tablist" (allowed on nav by ARIA in HTML:
 *   https://www.w3.org/TR/html-aria/#el-nav); its <ul>/<li> get role="none";
 *   each link gets role="tab", an id, aria-controls, aria-selected and a
 *   roving tabindex, and loses aria-current; each panel gets role="tabpanel",
 *   aria-labelledby, hidden when not selected, and tabindex="0" if it has
 *   nothing focusable inside.
 *
 * Events
 *   dui-tabs-change   bubbles from <dui-tabs> after the selection changes;
 *                     event.detail is { tab, panel }.
 *
 * Keyboard
 *   Right Arrow / Left Arrow: next or previous tab, wrapping; swapped when the
 *     element's direction is rtl
 *   Home / End: first or last tab
 *   Enter / Space: select the focused tab (manual activation)
 *   Tab: leaves the tab list for the panel
 */

const FOCUSABLE = "a[href], button, input, select, textarea, summary, iframe, [tabindex]:not([tabindex='-1']), [contenteditable='true']";

let uid = 0;

class DuiTabs extends HTMLElement {
  /** @type {HTMLElement[]} */
  #tabs = [];
  #onHashChange = () => {
    const tab = this.#tabFor(decodeURIComponent(location.hash.slice(1)));
    if (tab) this.select(tab);
  };

  connectedCallback() {
    if (!this.#tabs.length) this.#upgrade();
    window.addEventListener("hashchange", this.#onHashChange);
  }

  disconnectedCallback() {
    window.removeEventListener("hashchange", this.#onHashChange);
  }

  get selectedTab() {
    return this.#tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? null;
  }

  /** @param {string | HTMLElement} target a panel id or a tab element */
  select(target, { focus = false } = {}) {
    const tab = typeof target === "string" ? this.#tabFor(target) : target;
    if (!tab || !this.#tabs.includes(tab)) return;
    const changed = tab !== this.selectedTab;
    for (const other of this.#tabs) {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
      const panel = this.#panelFor(other);
      if (panel) panel.hidden = !selected;
    }
    if (focus) tab.focus();
    if (changed) {
      this.dispatchEvent(new CustomEvent("dui-tabs-change", { bubbles: true, detail: { tab, panel: this.#panelFor(tab) } }));
    }
  }

  #upgrade() {
    const list = this.querySelector(":scope > nav, :scope > [role='tablist']");
    if (!list) return;
    const links = [...list.querySelectorAll("a[href^='#']")];
    this.#tabs = links.filter((link) => this.#panelFor(link));
    if (!this.#tabs.length) return;

    list.setAttribute("role", "tablist");
    for (const wrapper of list.querySelectorAll("ul, ol, li")) wrapper.setAttribute("role", "none");

    const marked = this.#tabs.find((tab) => tab.getAttribute("aria-current") === "true");

    for (const tab of this.#tabs) {
      const panel = /** @type {HTMLElement} */ (this.#panelFor(tab));
      // A tab's selection is aria-selected from here on.
      tab.removeAttribute("aria-current");
      if (!tab.id) tab.id = `${panel.id}-tab-${++uid}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      // APG: a panel with no focusable content is itself focusable.
      if (!panel.querySelector(FOCUSABLE) && !panel.hasAttribute("tabindex")) panel.tabIndex = 0;
    }

    const initial =
      marked ??
      this.#tabFor(decodeURIComponent(location.hash.slice(1))) ??
      this.#tabs[0];
    this.select(initial);

    list.addEventListener("click", (event) => {
      const tab = /** @type {HTMLElement} */ (event.target).closest("[role='tab']");
      if (!tab || !this.#tabs.includes(/** @type {HTMLElement} */ (tab))) return;
      event.preventDefault(); // stay on the page; do not jump to the fragment
      this.select(/** @type {HTMLElement} */ (tab), { focus: true });
    });

    list.addEventListener("keydown", (event) => this.#onKeydown(event));
  }

  /** @param {KeyboardEvent} event */
  #onKeydown(event) {
    const current = /** @type {HTMLElement} */ (event.target);
    const index = this.#tabs.indexOf(current);
    if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    const rtl = getComputedStyle(this).direction === "rtl";
    const last = this.#tabs.length - 1;
    let next = -1;
    switch (event.key) {
      case "ArrowRight":
        next = rtl ? index - 1 : index + 1;
        break;
      case "ArrowLeft":
        next = rtl ? index + 1 : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        this.select(current, { focus: true });
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next < 0) next = last;
    if (next > last) next = 0;
    const tab = this.#tabs[next];
    if (this.getAttribute("activation") === "manual") {
      for (const other of this.#tabs) other.tabIndex = other === tab ? 0 : -1;
      tab.focus();
    } else {
      this.select(tab, { focus: true });
    }
  }

  /** @param {string} id */
  #tabFor(id) {
    if (!id) return undefined;
    return this.#tabs.find((tab) => tab.getAttribute("href") === `#${id}` || tab.getAttribute("aria-controls") === id);
  }

  /** @param {Element} link */
  #panelFor(link) {
    const id = decodeURIComponent((link.getAttribute("href") ?? "").slice(1));
    const panel = id ? document.getElementById(id) : null;
    return panel && this.contains(panel) && panel !== link ? panel : null;
  }
}

if (!customElements.get("dui-tabs")) customElements.define("dui-tabs", DuiTabs);

export { DuiTabs };
