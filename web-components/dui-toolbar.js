/*
 * <dui-toolbar>: roving tabindex and arrow keys for an APG Toolbar.
 *
 * Why script: role="toolbar" groups controls under one Tab stop, with
 * arrow keys moving between them (APG Toolbar pattern, roving tabindex).
 * HTML has no toolbar element and no way to manage that focus without
 * script. https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 * https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex
 *
 * Progressive enhancement: with JavaScript off the toolbar is a labelled
 * group of ordinary controls and each one is a Tab stop. Light DOM, no
 * dependencies, no build.
 *
 * API
 *   <dui-toolbar role="toolbar" aria-label="…">   (role is added if missing)
 *   aria-orientation="vertical"   Up and Down move instead of Left and Right
 *   Items: the buttons, links, selects and inputs inside, in DOM order,
 *   except disabled ones. Text inputs keep their own arrow keys.
 *
 * Events
 *   None. Controls fire their native events.
 *
 * Keyboard
 *   Tab: enters the toolbar on the last focused control (the first, at first)
 *   Right Arrow / Left Arrow: next or previous control, wrapping; swapped in
 *     right-to-left
 *   Down Arrow / Up Arrow: next or previous control when vertical
 *   Home / End: first or last control
 */

const ITEMS = "button, a[href], input, select, textarea, [tabindex]";
const TEXT_ENTRY = "input:not([type='button'], [type='checkbox'], [type='radio'], [type='reset'], [type='submit'], [type='image'], [type='color'], [type='file']), textarea, select";

class DuiToolbar extends HTMLElement {
  #ready = false;

  connectedCallback() {
    if (this.#ready) return;
    this.#ready = true;
    if (!this.hasAttribute("role")) this.setAttribute("role", "toolbar");
    const items = this.#items;
    const start = items.find((item) => item.tabIndex >= 0) ?? items[0];
    for (const item of items) item.tabIndex = item === start ? 0 : -1;

    this.addEventListener("focusin", (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (!this.#items.includes(target)) return;
      for (const item of this.#items) item.tabIndex = item === target ? 0 : -1;
    });
    this.addEventListener("keydown", (event) => this.#onKeydown(event));
  }

  get #items() {
    return /** @type {HTMLElement[]} */ ([...this.querySelectorAll(ITEMS)]).filter(
      (item) => !item.matches(":disabled") && !item.closest("[hidden]"),
    );
  }

  /** @param {KeyboardEvent} event */
  #onKeydown(event) {
    const target = /** @type {HTMLElement} */ (event.target);
    const items = this.#items;
    const index = items.indexOf(target);
    if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    const vertical = this.getAttribute("aria-orientation") === "vertical";
    const rtl = getComputedStyle(this).direction === "rtl";
    // Text fields need their own arrow, Home and End keys.
    if (target.matches(TEXT_ENTRY) && event.key !== "Tab") return;
    let next = -1;
    switch (event.key) {
      case vertical ? "ArrowDown" : "ArrowRight":
        next = !vertical && rtl ? index - 1 : index + 1;
        break;
      case vertical ? "ArrowUp" : "ArrowLeft":
        next = !vertical && rtl ? index + 1 : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    items[(next + items.length) % items.length].focus();
  }
}

if (!customElements.get("dui-toolbar")) customElements.define("dui-toolbar", DuiToolbar);

export { DuiToolbar };
