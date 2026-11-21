/*
 * <dui-tooltip>: shows a role="tooltip" popover on hover and on focus.
 *
 * Why script: a popover opens from a click (popovertarget) but HTML cannot
 * yet open one on hover or keyboard focus. The interestfor attribute
 * (Open UI interest invokers, https://open-ui.org/components/interest-invokers.explainer/)
 * is the coming standard for this and ships only in Chromium today. Until it
 * is interoperable, this element does the same job, and it can be removed
 * in favor of interestfor later without changing the markup inside.
 *
 * Follows WCAG 1.4.13 Content on Hover or Focus and the APG Tooltip notes
 * (https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/):
 * - shows on focus of the trigger and on pointer hover;
 * - Esc hides it without moving focus (dismissible);
 * - the pointer can move onto the tooltip without it closing (hoverable);
 * - it stays until focus or the pointer leaves (persistent).
 * https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
 *
 * Progressive enhancement: with JavaScript off the tooltip text never shows
 * visually, but the trigger still has its own name and the tooltip text is
 * still its accessible description through aria-describedby. That is why a
 * tooltip must never be the only label. Light DOM, no dependencies, no build.
 *
 * API
 *   <dui-tooltip>                     wraps one trigger and one tooltip
 *   trigger                           the element whose aria-describedby
 *                                     names the tooltip (else the first
 *                                     focusable child)
 *   <… popover="hint" role="tooltip" id>  the tooltip. "hint" falls back to
 *                                     "manual" where unsupported; this element
 *                                     handles Esc either way.
 *   element.show() / element.hide()
 *
 * Events
 *   None of its own; the popover fires the native "toggle" event.
 *
 * Keyboard
 *   Tab: focusing the trigger shows the tooltip; leaving it hides the tooltip
 *   Esc: hides the tooltip, focus stays on the trigger
 */

const HIDE_DELAY_MS = 120;

class DuiTooltip extends HTMLElement {
  /** @type {HTMLElement | null} */
  #trigger = null;
  /** @type {HTMLElement | null} */
  #tip = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer;
  #onDocumentKeydown = (/** @type {KeyboardEvent} */ event) => {
    if (event.key === "Escape" && this.#tip?.matches(":popover-open")) this.hide();
  };

  connectedCallback() {
    if (this.#tip) return;
    const tip = /** @type {HTMLElement | null} */ (this.querySelector("[role='tooltip'][popover]"));
    if (!tip) return;
    const trigger =
      /** @type {HTMLElement | null} */ (this.querySelector(`[aria-describedby~="${CSS.escape(tip.id)}"]`)) ??
      /** @type {HTMLElement | null} */ (this.querySelector("button, a[href], input, select, textarea, [tabindex]"));
    if (!trigger) return;
    this.#tip = tip;
    this.#trigger = trigger;

    trigger.addEventListener("focus", () => this.show());
    trigger.addEventListener("blur", () => this.hide());
    // The tooltip is a DOM child of this element, so hovering it counts as hovering the element.
    this.addEventListener("pointerenter", () => this.show());
    this.addEventListener("pointerleave", () => {
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        if (document.activeElement !== trigger) this.hide();
      }, HIDE_DELAY_MS);
    });
    tip.addEventListener("toggle", (event) => {
      const open = /** @type {ToggleEvent} */ (event).newState === "open";
      if (open) document.addEventListener("keydown", this.#onDocumentKeydown);
      else document.removeEventListener("keydown", this.#onDocumentKeydown);
    });
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this.#onDocumentKeydown);
    clearTimeout(this.#timer);
  }

  show() {
    clearTimeout(this.#timer);
    const tip = this.#tip;
    if (!tip || tip.matches(":popover-open")) return;
    try {
      tip.showPopover({ source: this.#trigger ?? undefined });
    } catch {
      tip.showPopover();
    }
  }

  hide() {
    clearTimeout(this.#timer);
    if (this.#tip?.matches(":popover-open")) this.#tip.hidePopover();
  }
}

if (!customElements.get("dui-tooltip")) customElements.define("dui-tooltip", DuiTooltip);

export { DuiTooltip };
