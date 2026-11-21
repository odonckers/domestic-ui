/*
 * <dui-combobox>: APG Combobox (list autocomplete) for an <input list>.
 *
 * Why script: <input list> with a <datalist> already suggests values with
 * no script, but the suggestion popup is drawn by the browser: it cannot be
 * styled, it differs between engines (and on mobile), and assistive
 * technology support varies. The APG Combobox pattern, list autocomplete
 * variant, needs a listbox the page owns, arrow keys with
 * aria-activedescendant (focus stays in the input), and a result count
 * announced while typing, which need script.
 * https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 * https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
 *
 * Progressive enhancement: with JavaScript off the markup is a native
 * <input list> with a <datalist>, which suggests the same values. On upgrade
 * the same <input> is kept (its name, value, label and form participation do
 * not change); only its list attribute is removed, so the native popup does
 * not show next to the listbox. The <datalist> stays in the DOM as the source
 * of the options. Light DOM, no dependencies, no build.
 *
 * Our choice: <input list> + <datalist> as the native fallback, not
 * <select>, because the value is free text and the upgrade reuses the same
 * input and the same options.
 *
 * API
 *   <dui-combobox>                    wraps a <label>, an <input list="id">
 *                                     and its <datalist id="id">
 *   <option value="…">                in the datalist: the suggestions; an
 *                                     optional label="…" is shown as a hint
 *   element.setOptions(values)        replaces the options: an array of
 *                                     strings or { value, label } objects
 *   element.open() / element.close()
 *   Changing the datalist's options from script works too: the component
 *   watches it and re-reads them.
 *
 * Filtering: built in, case-insensitive, "contains": an option matches when
 * its value or label contains the typed text anywhere. Our choice: contains,
 * not starts-with, because users often remember a word from the middle
 * ("York" for "New York"), and the native datalist popups in Chromium and
 * Firefox match the same way.
 *
 * What the upgrade does
 *   input: role="combobox", aria-autocomplete="list", aria-expanded,
 *          aria-controls (the listbox), aria-activedescendant while an option
 *          is active, autocomplete="off"; the list attribute is removed
 *   listbox: a <ul role="listbox"> after the input, labelled by the label,
 *          with one <li role="option"> per option; the active option has
 *          aria-selected="true" (as in the APG example)
 *   status: a visually hidden role="status" region, in the DOM from the
 *          upgrade on, that says "5 results" or "No results" after typing
 *
 * Events
 *   dui-combobox-filter   on <dui-combobox>, on every input, before
 *                         filtering; event.detail is { query }. Bubbles;
 *                         cancelable. Cancel it to filter elsewhere (on a
 *                         server): the component then shows the options as
 *                         given, unfiltered, until the page replaces them
 *                         (setOptions() or the datalist) for that query.
 *   change                on the <input>, when an option is accepted (Enter
 *                         or a click), so forms and frameworks see the value
 *   input                 native, while typing
 *
 * Keyboard (focus stays in the input)
 *   Down Arrow: opens the list and moves to the next option (the first if none, wrapping)
 *   Up Arrow: opens the list and moves to the previous option (the last if none, wrapping)
 *   Alt+Down Arrow: opens the list without moving to an option
 *   Alt+Up Arrow: closes the list
 *   Enter: accepts the active option and closes the list; with none active, submits the form
 *   Escape: closes the list; if it is already closed, clears the input
 *   Home / End: move the caret to the start or end of the input and leave the list
 *   Left Arrow / Right Arrow: move the caret and leave the list
 *   Typing: filters the options and opens the list when some match
 *   Tab: accepts nothing, closes the list and moves on
 */

let uid = 0;

/** @typedef {{ value: string, label: string }} Option */

class DuiCombobox extends HTMLElement {
  /** @type {HTMLInputElement | null} */
  #input = null;
  /** @type {HTMLDataListElement | null} */
  #datalist = null;
  /** @type {HTMLUListElement | null} */
  #listbox = null;
  /** @type {HTMLElement | null} */
  #status = null;
  /** @type {Option[]} */
  #options = [];
  /** @type {HTMLLIElement[]} */
  #shown = [];
  #active = -1;
  /** The page took over filtering for the current query (dui-combobox-filter canceled). */
  #external = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #announceTimer;
  /** @type {MutationObserver | null} */
  #observer = null;

  connectedCallback() {
    if (this.#input) return;
    const input = /** @type {HTMLInputElement | null} */ (this.querySelector("input[list]"));
    const datalist = input && /** @type {HTMLDataListElement | null} */ (document.getElementById(input.getAttribute("list") ?? ""));
    if (!input || !(datalist instanceof HTMLDataListElement)) return;
    this.#input = input;
    this.#datalist = datalist;

    const base = input.id || `dui-combobox-${++uid}`;
    if (!input.id) input.id = base;
    const label = /** @type {HTMLLabelElement | undefined} */ (input.labels?.[0]);
    if (label && !label.id) label.id = `${base}-label`;

    const listbox = document.createElement("ul");
    listbox.id = `${base}-listbox`;
    listbox.setAttribute("role", "listbox");
    if (label) listbox.setAttribute("aria-labelledby", label.id);
    this.#listbox = listbox;

    // The live region exists before it is ever updated, so screen readers pick up the first change.
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.className = "visually-hidden";
    status.dataset.comboboxStatus = "";
    this.#status = status;

    input.after(listbox, status);
    input.removeAttribute("list");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listbox.id);
    input.setAttribute("autocomplete", "off");

    this.#read();
    this.#render();
    this.#observer = new MutationObserver(() => this.#onOptionsChanged());
    this.#observer.observe(datalist, { childList: true, subtree: true, attributes: true, characterData: true });

    input.addEventListener("input", () => this.#onInput());
    input.addEventListener("keydown", (event) => this.#onKeydown(event));
    input.addEventListener("blur", () => this.close());
    // Keep focus in the input while choosing with a pointer.
    listbox.addEventListener("pointerdown", (event) => event.preventDefault());
    listbox.addEventListener("mousedown", (event) => event.preventDefault());
    listbox.addEventListener("click", (event) => {
      const option = /** @type {HTMLElement} */ (event.target).closest("[role='option']");
      if (option) this.#accept(this.#shown.indexOf(/** @type {HTMLLIElement} */ (option)));
    });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    clearTimeout(this.#announceTimer);
  }

  /**
   * Replace the options.
   * @param {Array<string | { value: string, label?: string }>} values
   */
  setOptions(values) {
    if (!this.#datalist) return;
    this.#datalist.replaceChildren(
      ...values.map((v) => {
        const { value, label = "" } = typeof v === "string" ? { value: v } : v;
        const option = document.createElement("option");
        option.value = value;
        if (label) option.label = label;
        return option;
      }),
    );
    this.#observer?.takeRecords(); // handled now, not again on the next microtask
    this.#onOptionsChanged();
  }

  /** Shows the list of matching options, if there are any. */
  open() {
    this.#render();
    if (!this.#input || !this.#listbox || !this.#shown.length) return;
    this.#input.setAttribute("aria-expanded", "true");
  }

  /** Hides the list; the text stays as it is. */
  close() {
    if (!this.#input) return;
    this.#input.setAttribute("aria-expanded", "false");
    this.#setActive(-1);
  }

  get #expanded() {
    return this.#input?.getAttribute("aria-expanded") === "true";
  }

  #read() {
    this.#options = [...(this.#datalist?.options ?? [])]
      .filter((o) => !o.disabled)
      .map((o) => ({ value: o.value, label: o.label !== o.value ? o.label : "" }));
  }

  #onOptionsChanged() {
    this.#read();
    const wasOpen = this.#expanded;
    this.#render();
    if (document.activeElement === this.#input && this.#input?.value && this.#shown.length) this.#input.setAttribute("aria-expanded", "true");
    else if (wasOpen && !this.#shown.length) this.close();
    if (document.activeElement === this.#input) this.#announce();
  }

  #onInput() {
    const query = this.#input?.value ?? "";
    const event = new CustomEvent("dui-combobox-filter", { bubbles: true, cancelable: true, detail: { query } });
    this.#external = !this.dispatchEvent(event);
    this.#render();
    if (this.#shown.length) this.#input?.setAttribute("aria-expanded", "true");
    else this.close();
    this.#announce();
  }

  /** Build the option elements for the current query. */
  #render() {
    if (!this.#listbox || !this.#input) return;
    const query = this.#input.value.trim().toLocaleLowerCase();
    const matches = this.#external || !query ? this.#options : this.#options.filter((o) => `${o.value}\n${o.label}`.toLocaleLowerCase().includes(query));
    const base = this.#listbox.id;
    this.#shown = matches.map((o, i) => {
      const li = document.createElement("li");
      li.id = `${base}-${i}`;
      li.setAttribute("role", "option");
      li.dataset.value = o.value;
      li.textContent = o.value;
      if (o.label) {
        const hint = document.createElement("span");
        hint.dataset.comboboxHint = "";
        hint.textContent = o.label;
        li.append(" ", hint);
      }
      return li;
    });
    this.#listbox.replaceChildren(...this.#shown);
    this.#active = -1;
    this.#input.removeAttribute("aria-activedescendant");
  }

  /** Say how many options match, once typing pauses. */
  #announce() {
    clearTimeout(this.#announceTimer);
    this.#announceTimer = setTimeout(() => {
      if (!this.#status) return;
      const n = this.#shown.length;
      this.#status.textContent = n === 0 ? "No results" : n === 1 ? "1 result" : `${n} results`;
    }, 400);
  }

  /** @param {number} index -1 for none */
  #setActive(index) {
    const input = this.#input;
    if (!input) return;
    this.#shown[this.#active]?.removeAttribute("aria-selected");
    this.#active = index;
    const option = this.#shown[index];
    if (!option) {
      input.removeAttribute("aria-activedescendant");
      return;
    }
    option.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", option.id);
    option.scrollIntoView({ block: "nearest" });
  }

  /** @param {number} index */
  #accept(index) {
    const input = this.#input;
    const option = this.#shown[index];
    if (!input || !option) return;
    input.value = option.dataset.value ?? "";
    this.close();
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** @param {KeyboardEvent} event */
  #onKeydown(event) {
    const count = this.#shown.length;
    if (event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowDown":
        if (event.altKey) {
          this.open();
          break;
        }
        if (!this.#expanded) {
          this.open();
          this.#setActive(this.#shown.length ? 0 : -1);
        } else if (count) this.#setActive((this.#active + 1) % count);
        break;
      case "ArrowUp":
        if (event.altKey) {
          this.close();
          break;
        }
        if (!this.#expanded) {
          this.open();
          this.#setActive(this.#shown.length - 1);
        } else if (count) this.#setActive(this.#active <= 0 ? count - 1 : this.#active - 1);
        break;
      case "Enter":
        if (!this.#expanded || this.#active < 0) {
          this.close();
          return; // Native: submits the form.
        }
        this.#accept(this.#active);
        break;
      case "Escape":
        if (this.#expanded) this.close();
        else if (this.#input?.value) {
          this.#input.value = "";
          this.#render();
        } else return; // Nothing to do: let a surrounding dialog close.
        break;
      case "Home":
      case "End":
      case "ArrowLeft":
      case "ArrowRight":
        // Native: the caret moves in the input. Visual focus leaves the list.
        this.#setActive(-1);
        return;
      case "Tab":
        this.close();
        return;
      default:
        return;
    }
    event.preventDefault();
  }
}

if (!customElements.get("dui-combobox")) customElements.define("dui-combobox", DuiCombobox);

export { DuiCombobox };
