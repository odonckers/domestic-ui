/*
 * <dui-app-shell>: collapsible sidebars and narrow-screen drawers for the
 * app shell layout (css/layout/app-shell.css).
 *
 * Why script: a button cannot hide another element, keep aria-expanded in
 * step with it, or open a <dialog> as a modal drawer depending on how wide
 * the shell is: invoker commands open and close dialogs, but a sidebar that
 * is part of the page when wide must not be a dialog then. Toggling the
 * hidden attribute, keeping aria-expanded true while a drawer is open, and
 * switching mode when the shell's own width crosses a breakpoint
 * (ResizeObserver) all need script.
 * https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 * https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
 *
 * Progressive enhancement: with JavaScript off both sidebars are always
 * shown (stacked above and below main when the shell is narrow, beside it
 * when wide) and the toggles keep their hidden attribute, so there is no
 * button that does nothing. On upgrade the element shows the toggles and
 * hides a sidebar that is collapsed or that does not fit beside main.
 * Light DOM, no dependencies, no build.
 *
 * Our choice: one copy of each sidebar. When the shell is wide enough the
 * sidebar is a plain landmark in its grid area and its toggle sets hidden
 * on it. When it is too narrow the same element is moved into a modal
 * drawer (<dialog data-dialog="drawer start | end" closedby="any">, built
 * once by this element) for as long as the drawer is open, and moved back
 * to its place when it closes. Screen readers hear "dialog" only while it
 * is a drawer, and there is never a second copy of the navigation.
 *
 * Our choice: the mode follows the shell's own inline size, not the
 * viewport, with the same breakpoints as app-shell.css: 48rem for the
 * primary sidebar and 64rem for the auxiliary one (a container query
 * cannot read a custom property, so both files write the numbers).
 *
 * API
 *   <dui-app-shell data-app-shell>   the shell itself (see app-shell.css)
 *   <button aria-controls="id" aria-expanded hidden>   a toggle for the
 *                               sidebar with that id: the <nav> or <aside>
 *                               before <main> (start) or the <aside> after
 *                               it (end). Several toggles may control one
 *                               sidebar; keep at least one outside it.
 *                               aria-expanded="false" in the markup starts
 *                               the sidebar collapsed when it sits beside
 *                               main. A sidebar without a toggle is left
 *                               alone (always shown).
 *   close-label="…"             the drawers' close button (default "Close")
 *   element.show(edge)          expands the "start" or "end" sidebar, or
 *                               opens it as a drawer when narrow
 *   element.hide(edge)          collapses it, or closes its drawer
 *   element.toggle(edge)        either, as its toggle does
 *   element.isDrawer(edge)      true while that sidebar does not fit beside main
 *
 * What the upgrade does
 *   toggles: hidden removed; aria-expanded kept true while the sidebar is
 *     shown beside main or open as a drawer, false otherwise
 *   sidebars: hidden while collapsed or while they do not fit beside main
 *   drawers: one <dialog> per sidebar, appended to the shell on first use:
 *     a <header> with an <h2> (the toggle's text, which names the dialog)
 *     and a close button; the sidebar is moved in while it is open
 *
 * Events
 *   dui-app-shell-toggle   on <dui-app-shell> after a sidebar is expanded,
 *                          collapsed, opened or closed by a toggle or a
 *                          method; event.detail is { sidebar, edge,
 *                          expanded, drawer }. Bubbles. Store
 *                          detail.expanded to remember a collapsed sidebar.
 *
 * Keyboard
 *   Enter / Space: on a toggle, collapses or expands its sidebar; when narrow, opens it as a drawer
 *   Esc: closes an open drawer; focus returns to the element that opened it
 *   Tab / Shift+Tab: inside an open drawer, move through its close button and links
 */

/** Same lengths as the container queries in css/layout/app-shell.css, in rem. */
const BREAKPOINTS = { start: 48, end: 64 };

/**
 * @typedef {object} Sidebar
 * @property {HTMLElement} element
 * @property {"start" | "end"} edge
 * @property {HTMLButtonElement[]} toggles
 * @property {boolean} expanded   the user's choice for when it sits beside main
 * @property {boolean | null} docked  beside main (true) or a drawer (false)
 * @property {HTMLDialogElement | null} dialog
 * @property {Comment} marker      where the sidebar goes back to
 * @property {Element | null} opener
 */

class DuiAppShell extends HTMLElement {
  /** @type {Sidebar[]} */
  #sidebars = [];
  /** @type {ResizeObserver | null} */
  #observer = null;
  #ready = false;
  #frame = 0;

  connectedCallback() {
    if (this.#ready) {
      this.#observer?.observe(this);
      return;
    }
    const main = this.querySelector(":scope > main");
    if (!main) return;
    this.#ready = true;
    /** @type {[Element | null, "start" | "end"][]} */
    const parts = [
      [this.querySelector(":scope > :is(nav, aside):has(~ main)"), "start"],
      [this.querySelector(":scope > main ~ aside"), "end"],
    ];
    for (const [element, edge] of parts) {
      if (!(element instanceof HTMLElement) || !element.id) continue;
      const toggles = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll("button[aria-controls]")].filter((b) => b.getAttribute("aria-controls")?.split(/\s+/).includes(element.id)));
      if (!toggles.length) continue;
      /** @type {Sidebar} */
      const sidebar = {
        element,
        edge,
        toggles,
        expanded: toggles[0].getAttribute("aria-expanded") !== "false",
        docked: null,
        dialog: null,
        marker: document.createComment(` ${edge} sidebar `),
        opener: null,
      };
      for (const toggle of toggles) {
        toggle.hidden = false;
        toggle.addEventListener("click", () => this.#toggle(sidebar, toggle));
      }
      this.#sidebars.push(sidebar);
    }
    if (!this.#sidebars.length) return;
    this.#layout();
    // Re-check on the next frame, not inside the observer: hiding a sidebar resizes the shell again.
    this.#observer = new ResizeObserver(() => {
      cancelAnimationFrame(this.#frame);
      this.#frame = requestAnimationFrame(() => this.#layout());
    });
    this.#observer.observe(this);
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
  }

  /** @param {"start" | "end"} edge */
  show(edge) {
    const sidebar = this.#find(edge);
    if (!sidebar) return;
    if (sidebar.docked) this.#setDocked(sidebar, true);
    else this.#open(sidebar, document.activeElement);
  }

  /** @param {"start" | "end"} edge */
  hide(edge) {
    const sidebar = this.#find(edge);
    if (!sidebar) return;
    if (sidebar.docked) this.#setDocked(sidebar, false);
    else sidebar.dialog?.close();
  }

  /** @param {"start" | "end"} edge */
  toggle(edge) {
    const sidebar = this.#find(edge);
    if (sidebar) this.#toggle(sidebar, document.activeElement);
  }

  /** @param {"start" | "end"} edge */
  isDrawer(edge) {
    return this.#find(edge)?.docked === false;
  }

  /** @param {string} edge */
  #find(edge) {
    return this.#sidebars.find((s) => s.edge === edge);
  }

  /** @param {Sidebar} sidebar @param {Element | null} opener */
  #toggle(sidebar, opener) {
    if (sidebar.docked) this.#setDocked(sidebar, !sidebar.expanded);
    else if (sidebar.dialog?.open) sidebar.dialog.close();
    else this.#open(sidebar, opener);
  }

  /** The mode of each sidebar from the shell's content width, as the container queries see it. */
  #layout() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const width = this.clientWidth;
    for (const sidebar of this.#sidebars) {
      const docked = width >= BREAKPOINTS[sidebar.edge] * rem;
      if (docked === sidebar.docked) continue;
      sidebar.docked = docked;
      if (sidebar.dialog?.open) sidebar.dialog.close(); // its close handler puts it back at once
      this.#sync(sidebar);
    }
  }

  /** hidden and aria-expanded from the state, unless the sidebar is open as a drawer. @param {Sidebar} sidebar */
  #sync(sidebar) {
    if (sidebar.dialog?.open) return;
    const shown = Boolean(sidebar.docked && sidebar.expanded);
    sidebar.element.hidden = !shown;
    for (const toggle of sidebar.toggles) toggle.setAttribute("aria-expanded", String(shown));
  }

  /** @param {Sidebar} sidebar @param {boolean} expanded */
  #setDocked(sidebar, expanded) {
    if (expanded === sidebar.expanded) return;
    const hadFocus = sidebar.element.contains(document.activeElement);
    sidebar.expanded = expanded;
    this.#sync(sidebar);
    // Focus never stays on a hidden element: give it to the first toggle outside the sidebar.
    if (hadFocus && !expanded) sidebar.toggles.find((t) => !sidebar.element.contains(t))?.focus();
    this.#announce(sidebar);
  }

  /** @param {Sidebar} sidebar @param {Element | null} opener */
  #open(sidebar, opener) {
    const dialog = (sidebar.dialog ??= this.#drawer(sidebar));
    if (dialog.open) return;
    sidebar.opener = opener;
    if (!sidebar.marker.isConnected) sidebar.element.before(sidebar.marker);
    dialog.append(sidebar.element);
    sidebar.element.hidden = false;
    dialog.showModal();
    for (const toggle of sidebar.toggles) toggle.setAttribute("aria-expanded", "true");
    this.#announce(sidebar);
  }

  /** Builds the drawer for a sidebar: dialog.css's drawer with a heading and a close button. @param {Sidebar} sidebar */
  #drawer(sidebar) {
    const dialog = document.createElement("dialog");
    dialog.dataset.dialog = `drawer ${sidebar.edge}`;
    dialog.setAttribute("closedby", "any");
    const header = document.createElement("header");
    const heading = document.createElement("h2");
    heading.id = `${sidebar.element.id}-drawer-title`;
    const toggle = sidebar.toggles[0];
    heading.textContent = (toggle.getAttribute("aria-label") ?? toggle.textContent ?? "").trim().replace(/\s+/g, " ");
    const close = document.createElement("button");
    close.type = "button";
    close.dataset.button = "quiet";
    close.textContent = this.getAttribute("close-label") ?? "Close";
    close.addEventListener("click", () => dialog.close());
    header.append(heading, close);
    dialog.append(header);
    dialog.setAttribute("aria-labelledby", heading.id);
    // A click on the backdrop closes it where closedby="any" is not supported yet.
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      if (!inside) dialog.close();
    });
    dialog.addEventListener("close", () => this.#closed(sidebar));
    this.append(dialog);
    return dialog;
  }

  /** After a drawer closes: state now, the sidebar back in place once the closing transition is over. @param {Sidebar} sidebar */
  #closed(sidebar) {
    const dialog = /** @type {HTMLDialogElement} */ (sidebar.dialog);
    if (!sidebar.docked) for (const toggle of sidebar.toggles) toggle.setAttribute("aria-expanded", "false");
    // The browser returns focus to the element focused before showModal(); make sure it lands somewhere.
    const opener = sidebar.opener;
    if (opener instanceof HTMLElement && opener.isConnected && (document.activeElement === document.body || dialog.contains(document.activeElement))) opener.focus();
    const putBack = () => {
      if (dialog.open || !sidebar.marker.isConnected) return;
      sidebar.marker.replaceWith(sidebar.element);
      this.#sync(sidebar);
    };
    if (sidebar.docked) putBack();
    else Promise.all(dialog.getAnimations().map((a) => a.finished.catch(() => {}))).then(putBack);
    this.#announce(sidebar);
  }

  /** @param {Sidebar} sidebar */
  #announce(sidebar) {
    const drawer = !sidebar.docked;
    const expanded = drawer ? Boolean(sidebar.dialog?.open) : sidebar.expanded;
    this.dispatchEvent(new CustomEvent("dui-app-shell-toggle", { bubbles: true, detail: { sidebar: sidebar.element, edge: sidebar.edge, expanded, drawer } }));
  }
}

if (!customElements.get("dui-app-shell")) customElements.define("dui-app-shell", DuiAppShell);

export { DuiAppShell };
