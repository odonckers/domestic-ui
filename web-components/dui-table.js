/*
 * <dui-table>: sortable columns and row selection for a native <table>.
 *
 * Why script: HTML tables cannot reorder their rows, and a checkbox cannot
 * check its siblings, count them or be indeterminate from markup (the
 * indeterminate state is an IDL attribute only). Sorting as in the APG
 * Sortable Table example, a "select all" checkbox, the selection count and
 * enabling bulk actions all need script.
 * https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/
 * https://html.spec.whatwg.org/multipage/input.html#dom-input-indeterminate
 *
 * Progressive enhancement: with JavaScript off the table is a plain table
 * in the server's order, sortable headers are plain text and row
 * checkboxes are form controls (name and value) that a surrounding <form>
 * submits with its bulk-action buttons. On upgrade the element adds the
 * sort buttons, the caption hint, the "select all" checkbox and the count.
 * It adds no ARIA roles: the table stays a table. Light DOM, no
 * dependencies, no build. Styles: css/components/organisms/data-table.css.
 *
 * Our choice: the script upgrades plain header text into buttons, so with
 * JavaScript off there are no buttons that do nothing.
 *
 * Our choice: following the APG example, nothing is announced after a sort
 * beyond aria-sort, which screen readers read with the column header; a
 * visually hidden hint is added to the caption (", column headers with
 * buttons are sortable."), only once the buttons exist.
 *
 * API
 *   <dui-table>                 wraps the <table data-table> (and its scroll
 *                               container), a role="status" element for the
 *                               selection count and an optional
 *                               role="toolbar" of bulk actions
 *   data-table="sortable"       on a <thead> <th>: its content moves into a
 *                               <button> followed by an aria-hidden arrow
 *   aria-sort="ascending | descending"   on the sorted <th>; set in markup
 *                               when the server sorted the rows (they are
 *                               not re-sorted on upgrade)
 *   data-sort-value="…"         on a cell: the value to sort by instead of
 *                               its text. A <time datetime> in a cell sorts
 *                               by its datetime.
 *   sort-hint="…"               the caption hint (default ", column headers
 *                               with buttons are sortable.")
 *   select-all-label="…"        the name of the "select all" checkbox
 *                               (default "Select all rows"); set it when a
 *                               page has more than one selectable table
 *   selection-text="…"          the count; {selected} and {total} are
 *                               replaced (default "{selected} of {total}
 *                               selected")
 *   element.sort(column, direction)   sorts by a <th> or a column index;
 *                               fires dui-table-sort first
 *   element.selectedRows        the <tr>s whose checkbox is checked
 *
 * Sorting compares, per column: numbers when every non-empty value is a
 * number (currency signs, spaces, "%" and "," group separators are
 * ignored, so "€1,240.00" is 1240), ISO dates ("2025-03-12") as dates, and
 * anything else as text with Intl.Collator (numeric, case-insensitive), in
 * the table's language. Use data-sort-value for anything else (a decimal
 * comma, "12 Mar"). The sort is stable; every <tbody> is sorted on its own;
 * row spans are not supported. Clicking a sorted column reverses it;
 * another column starts ascending.
 *
 * Selection: the checkboxes in the first cell of each body row (rows with
 * hidden are skipped). The empty first cell of the header row gets a
 * "select all" checkbox: checked when every row is, indeterminate when
 * some are, disabled when there are no rows; it checks or unchecks every
 * row. The first role="status" inside the element but outside the table
 * gets the count; the controls of a role="toolbar" inside the element are
 * disabled while no row is selected. Rows added or removed later (after
 * loading) are picked up. A checkbox changed from script should dispatch
 * a change event, as a user's click would.
 *
 * Events
 *   dui-table-sort   on <dui-table>, before rows move; event.detail is
 *                    { column, index, direction }: the <th>, its column
 *                    index and "ascending" or "descending". Bubbles;
 *                    cancelable: cancel it to sort on the server, then set
 *                    aria-sort on the <th> and replace the rows yourself.
 *   change           native, on each checkbox
 *
 * Keyboard
 *   Enter / Space: on a sort button, sorts by that column (again: reverses)
 *   Space: on a checkbox, checks or unchecks it
 */

const NUMBER = /^[-+−]?[\p{Sc}\s]*[-+−]?\d[\d,\s]*(?:\.\d+)?\s*[\p{Sc}%]?$/u;
const ISO_DATE = /^\d{4}-\d{2}(?:-\d{2})?(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** @param {string} text @returns {number | null} */
function toNumber(text) {
  if (NUMBER.test(text)) {
    const value = Number(text.replace(/[^\d.]/g, ""));
    if (Number.isFinite(value)) return /^[^\d]*[-−]/.test(text) ? -value : value;
  }
  if (ISO_DATE.test(text)) {
    const time = Date.parse(text);
    if (Number.isFinite(time)) return time;
  }
  return null;
}

/** The cell that covers column `index` of a row, counting colspans. @param {HTMLTableRowElement} row @param {number} index */
function cellAt(row, index) {
  let column = 0;
  for (const cell of row.cells) {
    column += cell.colSpan;
    if (column > index) return cell;
  }
  return null;
}

/** @param {HTMLTableCellElement} cell */
function columnIndex(cell) {
  let index = 0;
  for (let c = cell.previousElementSibling; c; c = c.previousElementSibling) index += /** @type {HTMLTableCellElement} */ (c).colSpan;
  return index;
}

class DuiTable extends HTMLElement {
  /** @type {HTMLTableElement | null} */
  #table = null;
  /** @type {HTMLInputElement | null} */
  #selectAll = null;
  #queued = false;

  connectedCallback() {
    if (this.#table) return;
    this.#table = this.querySelector("table");
    if (!this.#table) return;
    this.#upgradeSorting();
    this.addEventListener("click", (event) => this.#onClick(event));
    this.addEventListener("change", (event) => this.#onChange(event));
    // Rows added, removed or hidden later (loading, filtering) update the selection.
    new MutationObserver(() => this.#queueUpdate()).observe(this.#table, { childList: true, subtree: true, attributeFilter: ["hidden"] });
    this.#update();
  }

  get selectedRows() {
    return this.#rowBoxes()
      .filter((box) => box.checked)
      .map((box) => /** @type {HTMLTableRowElement} */ (box.closest("tr")));
  }

  /**
   * @param {HTMLTableCellElement | number} column a header cell or a column index
   * @param {"ascending" | "descending"} [direction]
   * @returns {boolean} false when the dui-table-sort event was canceled
   */
  sort(column, direction = "ascending") {
    const table = this.#table;
    if (!table?.tHead) return false;
    const headers = [...table.tHead.querySelectorAll("th")];
    const th = typeof column === "number" ? headers.find((h) => columnIndex(h) === column) : column;
    if (!th || !headers.includes(th)) return false;
    const index = columnIndex(th);
    const event = new CustomEvent("dui-table-sort", { bubbles: true, cancelable: true, detail: { column: th, index, direction } });
    if (!this.dispatchEvent(event)) return false;

    // APG: aria-sort on the sorted header only.
    for (const other of headers) if (other !== th) other.removeAttribute("aria-sort");
    th.setAttribute("aria-sort", direction);

    const sign = direction === "descending" ? -1 : 1;
    const collator = new Intl.Collator(table.closest("[lang]")?.getAttribute("lang") || undefined, { numeric: true, sensitivity: "base" });
    for (const body of table.tBodies) {
      const keys = [...body.rows].map((row, i) => {
        const cell = cellAt(row, index);
        const raw = cell?.dataset.sortValue ?? cell?.querySelector("time[datetime]")?.getAttribute("datetime") ?? cell?.textContent ?? "";
        const text = raw.trim().replace(/\s+/g, " ");
        return { row, i, text, number: text ? toNumber(text) : null };
      });
      if (keys.length < 2) continue;
      const numeric = keys.every((k) => !k.text || k.number !== null);
      /** @param {typeof keys[number]} a @param {typeof keys[number]} b */
      const compare = (a, b) => {
        if (!numeric) return collator.compare(a.text, b.text);
        if (a.number === null || b.number === null) return a.number === b.number ? 0 : a.number === null ? -1 : 1;
        return a.number - b.number;
      };
      keys.sort((a, b) => sign * compare(a, b) || a.i - b.i);
      body.append(...keys.map((k) => k.row));
    }
    return true;
  }

  #upgradeSorting() {
    const table = /** @type {HTMLTableElement} */ (this.#table);
    const sortable = [...(table.tHead?.querySelectorAll("th[data-table~='sortable']") ?? [])];
    for (const th of sortable) {
      if (th.querySelector("button")) continue;
      const button = document.createElement("button");
      button.type = "button";
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      button.append(...th.childNodes, arrow);
      th.append(button);
    }
    if (sortable.length && table.caption) {
      const hint = document.createElement("span");
      hint.className = "visually-hidden";
      hint.textContent = this.getAttribute("sort-hint") ?? ", column headers with buttons are sortable.";
      table.caption.append(hint);
    }
  }

  /** @param {Event} event */
  #onClick(event) {
    const button = /** @type {Element} */ (event.target).closest?.("th > button");
    const th = /** @type {HTMLTableCellElement | null} */ (button?.parentElement ?? null);
    if (!th?.matches("[data-table~='sortable']") || !this.#table?.tHead?.contains(th)) return;
    this.sort(th, th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending");
  }

  /** @param {Event} event */
  #onChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox" || !this.#table?.contains(target)) return;
    if (target === this.#selectAll) {
      for (const box of this.#rowBoxes()) if (!box.disabled) box.checked = target.checked;
    }
    this.#update();
  }

  /** @returns {HTMLInputElement[]} */
  #rowBoxes() {
    return [...(this.#table?.querySelectorAll(":scope > tbody > tr:not([hidden]) > :first-child input[type='checkbox']") ?? [])];
  }

  #queueUpdate() {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      this.#update();
    });
  }

  /** The "select all" checkbox: the one in the first header cell, or a new one if that cell is empty. */
  #findSelectAll() {
    const cell = this.#table?.tHead?.rows[0]?.cells[0];
    if (!cell) return null;
    const existing = cell.querySelector("input[type='checkbox']");
    if (existing) return /** @type {HTMLInputElement} */ (existing);
    if (cell.textContent?.trim() || cell.children.length) return null;
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    const name = document.createElement("span");
    name.className = "visually-hidden";
    name.textContent = this.getAttribute("select-all-label") ?? "Select all rows";
    label.append(box, name);
    cell.append(label);
    return box;
  }

  #update() {
    const table = this.#table;
    if (!table) return;
    const boxes = this.#rowBoxes();
    if (!boxes.length && !this.#selectAll) return; // No selection in this table (yet).
    this.#selectAll ??= this.#findSelectAll();
    const selected = boxes.filter((box) => box.checked).length;
    if (this.#selectAll) {
      this.#selectAll.checked = boxes.length > 0 && selected === boxes.length;
      this.#selectAll.indeterminate = selected > 0 && selected < boxes.length;
      this.#selectAll.disabled = boxes.length === 0;
    }
    const status = [...this.querySelectorAll("[role='status']")].find((el) => !table.contains(el));
    if (status) {
      const text = (this.getAttribute("selection-text") ?? "{selected} of {total} selected").replace("{selected}", String(selected)).replace("{total}", String(boxes.length));
      // Only on a change: rewriting the same text can repeat the announcement.
      if (status.textContent !== text) status.textContent = text;
    }
    for (const control of this.querySelectorAll("[role='toolbar'] :is(button, input, select, textarea)")) {
      if (table.contains(control)) continue;
      /** @type {HTMLButtonElement} */ (control).disabled = selected === 0;
    }
  }
}

if (!customElements.get("dui-table")) customElements.define("dui-table", DuiTable);

export { DuiTable };
