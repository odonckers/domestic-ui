/*
 * <dui-menu>: APG Menu Button keyboard behavior for a popover of actions.
 *
 * Why script: a button with popovertarget already opens, closes and light
 * dismisses the list natively, but HTML has no menu widget. The APG Menu
 * Button pattern expects arrow keys between items (one Tab stop), opening
 * with Down or Up Arrow on a chosen item, Home/End and typeahead, which
 * need script. https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 *
 * Progressive enhancement: with JavaScript off the button still toggles the
 * popover and every action is a plain button in the tab order. The ARIA
 * menu roles are added only by this script, so assistive technology is never
 * told "menu" without the keyboard behavior a menu promises.
 * Light DOM, no dependencies, no build.
 *
 * API
 *   <dui-menu>                       wraps the button and the popover
 *   <button popovertarget="id">      the menu button (first one inside)
 *   <div id="id" popover data-popover>  the menu; its child <button> and
 *                                    <a href> elements (or those in <li>) are
 *                                    the items, <hr> a separator
 *   element.open({ focus: "first" | "last" }) / element.close()
 *
 * What the upgrade does
 *   button: aria-haspopup="menu", aria-expanded, aria-controls
 *   popover: role="menu", aria-labelledby the button
 *   items: role="menuitem", tabindex="-1"; list wrappers role="none"
 *
 * Events
 *   None of its own: listen for "click" on the items, and for the native
 *   "toggle" event on the popover.
 *
 * Keyboard
 *   Enter / Space / Down Arrow: on the button, opens and focuses the first item
 *   Up Arrow: on the button, opens and focuses the last item
 *   Down Arrow / Up Arrow: next or previous item, wrapping
 *   Home / End: first or last item
 *   A printable character: next item whose label starts with it
 *   Enter / Space: activates the item (native click), then closes the menu
 *   Esc: closes the menu and returns focus to the button
 *   Tab / Shift+Tab: closes the menu and moves focus on
 */

let uid = 0;

class DuiMenu extends HTMLElement {
  /** @type {HTMLButtonElement | null} */
  #button = null;
  /** @type {HTMLElement | null} */
  #menu = null;
  /** @type {"first" | "last"} */
  #focusOnOpen = "first";

  connectedCallback() {
    if (this.#menu) return;
    const button = /** @type {HTMLButtonElement | null} */ (this.querySelector("button[popovertarget]"));
    const menu = button && document.getElementById(button.getAttribute("popovertarget") ?? "");
    if (!button || !menu || !this.contains(menu)) return;
    this.#button = button;
    this.#menu = menu;

    if (!button.id) button.id = `dui-menu-button-${++uid}`;
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", menu.id);
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-labelledby", button.id);
    for (const wrapper of menu.querySelectorAll("ul, ol, li")) wrapper.setAttribute("role", "none");
    for (const item of this.#items) {
      item.setAttribute("role", "menuitem");
      item.tabIndex = -1;
    }

    button.addEventListener("keydown", (event) => {
      if (event.key === "Tab" && menu.matches(":popover-open")) {
        menu.hidePopover();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      this.open({ focus: event.key === "ArrowUp" ? "last" : "first" });
    });
    // A pointer or Enter/Space click toggles natively; focus the first item when it opens.
    button.addEventListener("click", () => {
      this.#focusOnOpen = "first";
    });

    menu.addEventListener("toggle", (event) => {
      const open = /** @type {ToggleEvent} */ (event).newState === "open";
      button.setAttribute("aria-expanded", String(open));
      // Opened natively (click, Enter, Space): move focus in, unless open() already did.
      if (open && !menu.contains(document.activeElement)) this.#focusItem(this.#focusOnOpen === "last" ? this.#items.length - 1 : 0);
    });
    menu.addEventListener("keydown", (event) => this.#onKeydown(event));
    menu.addEventListener("click", (event) => {
      const item = /** @type {HTMLElement} */ (event.target).closest("[role='menuitem']");
      if (item && !item.matches(":disabled, [aria-disabled='true']")) this.close();
    });
    // Tab moves focus out; close the menu once focus has left it.
    menu.addEventListener("focusout", (event) => {
      const to = /** @type {Node | null} */ (event.relatedTarget);
      if (to && !menu.contains(to) && menu.matches(":popover-open")) menu.hidePopover();
    });
  }

  /** @param {{ focus?: "first" | "last" }} [options] */
  open({ focus = "first" } = {}) {
    if (!this.#menu || !this.#button) return;
    this.#focusOnOpen = focus;
    if (this.#menu.matches(":popover-open")) {
      this.#focusItem(focus === "last" ? this.#items.length - 1 : 0);
      return;
    }
    try {
      this.#menu.showPopover({ source: this.#button });
    } catch {
      this.#menu.showPopover();
    }
    // showPopover() is synchronous, so focus can move now rather than on the queued toggle event.
    this.#focusItem(focus === "last" ? this.#items.length - 1 : 0);
  }

  /** Closes the menu and returns focus to the button. */
  close() {
    if (!this.#menu?.matches(":popover-open")) return;
    this.#menu.hidePopover();
    this.#button?.focus();
  }

  get #items() {
    if (!this.#menu) return [];
    return /** @type {HTMLElement[]} */ ([
      ...this.#menu.querySelectorAll(":scope > :is(button, a[href]), :scope > :is(ul, ol) > li > :is(button, a[href])"),
    ]).filter((item) => !item.hidden);
  }

  /** @param {number} index */
  #focusItem(index) {
    const items = this.#items;
    if (!items.length) return;
    const wrapped = (index + items.length) % items.length;
    items[wrapped].focus();
  }

  /** @param {KeyboardEvent} event */
  #onKeydown(event) {
    const items = this.#items;
    const index = items.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowDown":
        this.#focusItem(index + 1);
        break;
      case "ArrowUp":
        this.#focusItem(index < 0 ? items.length - 1 : index - 1);
        break;
      case "Home":
        this.#focusItem(0);
        break;
      case "End":
        this.#focusItem(items.length - 1);
        break;
      case "Escape":
        this.close();
        break;
      case "Tab":
        // No preventDefault: focus moves on and the focusout handler closes the menu.
        return;
      default: {
        if (event.key.length !== 1 || event.key === " ") return;
        const char = event.key.toLocaleLowerCase();
        const order = [...items.slice(index + 1), ...items.slice(0, index + 1)];
        const match = order.find((item) => item.textContent?.trim().toLocaleLowerCase().startsWith(char));
        if (match) match.focus();
        break;
      }
    }
    event.preventDefault();
  }
}

if (!customElements.get("dui-menu")) customElements.define("dui-menu", DuiMenu);

export { DuiMenu };
