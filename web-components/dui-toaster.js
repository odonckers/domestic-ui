/*
 * <dui-toaster>: a toast region with a small API to add and dismiss messages.
 *
 * Why script: toasts are messages your script creates after something
 * happens (a save, a copy, a failed request). HTML has the live region
 * (role="status") that announces them, but no element that builds a
 * message, adds a dismiss button and moves focus sensibly when a toast
 * goes away. This element does only that. See explainers/toast.md.
 *
 * Accessibility
 * - The region is role="status" (polite) and MUST be in the page before
 *   any message is added, or screen readers may not announce it
 *   (WCAG 4.1.3 Status Messages; technique ARIA22).
 *   https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
 * - Messages never dismiss themselves (WCAG 2.2.1 Timing Adjustable); each
 *   has a Dismiss button.
 * - The tone is written as a text prefix ("Success:"), never color alone
 *   (WCAG 1.4.1).
 * - A toast never takes focus. When a focused Dismiss button removes its
 *   toast, focus moves to the next toast's button, else the previous one,
 *   else back to where it was before entering the region (WCAG 2.4.3).
 *
 * Progressive enhancement: toasts rendered by the server inside the region
 * show with JavaScript off; this element adds their Dismiss buttons when it
 * loads. Light DOM, no dependencies, no build.
 *
 * API
 *   <dui-toaster data-alert="toasts" role="status"></dui-toaster>
 *     (role="status" is added if missing)
 *   element.show(text, { tone, prefix }) → the toast element
 *     tone: "info" | "success" | "warning" | "danger" (default "info")
 *     prefix: the leading word (default "Info:", "Success:", "Warning:",
 *     "Error:"; pass your own for other languages, or "" for none)
 *   element.dismiss(toast)
 *   data-dismiss-label="…"   on <dui-toaster>: Dismiss button text (default "Dismiss")
 *
 * Events
 *   dui-toast-dismiss   bubbles from the toast before it is removed; cancelable.
 *
 * Keyboard
 *   Tab: reaches each toast's Dismiss button (toasts never take focus)
 *   Enter / Space: on Dismiss, removes the toast
 */

const PREFIX = { info: "Info:", success: "Success:", warning: "Warning:", danger: "Error:" };

let uid = 0;

class DuiToaster extends HTMLElement {
  /** @type {HTMLElement | null} */
  #returnFocus = null;

  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "status");
    for (const toast of this.children) this.#addDismiss(/** @type {HTMLElement} */ (toast));
    this.addEventListener("click", (event) => {
      const button = /** @type {HTMLElement} */ (event.target).closest("[data-alert~='dismiss']");
      const toast = button?.closest("dui-toaster > *");
      if (toast) this.dismiss(/** @type {HTMLElement} */ (toast));
    });
    this.addEventListener("focusin", (event) => {
      const from = /** @type {HTMLElement | null} */ (event.relatedTarget);
      if (from && !this.contains(from)) this.#returnFocus = from;
    });
  }

  /**
   * @param {string} text
   * @param {{ tone?: "info" | "success" | "warning" | "danger", prefix?: string }} [options]
   */
  show(text, { tone = "info", prefix = PREFIX[tone] ?? "" } = {}) {
    const toast = document.createElement("div");
    toast.dataset.alert = tone;
    const message = document.createElement("p");
    message.id = `dui-toast-${++uid}`;
    if (prefix) {
      const strong = document.createElement("strong");
      strong.textContent = prefix;
      message.append(strong, " ");
    }
    message.append(text);
    toast.append(message);
    this.#addDismiss(toast);
    this.append(toast);
    return toast;
  }

  /** @param {HTMLElement} toast */
  dismiss(toast) {
    if (toast.parentElement !== this) return;
    const event = new CustomEvent("dui-toast-dismiss", { bubbles: true, cancelable: true });
    if (!toast.dispatchEvent(event)) return;
    const hadFocus = toast.contains(document.activeElement);
    const sibling = /** @type {HTMLElement | null} */ (toast.nextElementSibling ?? toast.previousElementSibling);
    toast.remove();
    if (!hadFocus) return;
    const next = sibling?.querySelector("[data-alert~='dismiss']");
    if (next instanceof HTMLElement) next.focus();
    else if (this.#returnFocus?.isConnected) this.#returnFocus.focus();
  }

  /** @param {HTMLElement} toast */
  #addDismiss(toast) {
    if (toast.querySelector("[data-alert~='dismiss']")) return;
    const message = toast.querySelector("p, div") ?? toast;
    if (!message.id) message.id = `dui-toast-${++uid}`;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.alert = "dismiss";
    button.dataset.button = "quiet small";
    button.textContent = this.dataset.dismissLabel ?? "Dismiss";
    button.setAttribute("aria-describedby", message.id);
    toast.append(button);
  }
}

if (!customElements.get("dui-toaster")) customElements.define("dui-toaster", DuiToaster);

export { DuiToaster };
