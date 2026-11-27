// @ts-check
import { test, expect } from "@playwright/test";
import { examples, blockExternalRequests, withoutMotion } from "./helpers.js";

/*
 * A keyboard sweep of every example page, in every browser project: press Tab
 * from the top until focus comes back around, and check each stop.
 *
 * - Every stop can be reached, and Tab does not get stuck (no keyboard trap).
 *   https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html
 * - Every stop shows a focus indicator: an outline or a box-shadow on the
 *   element or its ::before or ::after (a clickable card's ring), or on a
 *   nearby ancestor that styles :has(:focus-visible).
 *   https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
 * - Every stop is on screen after the browser scrolls to it, and not covered
 *   by something else (a sticky header, for example).
 *   https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
 * - Shift+Tab walks the same stops in reverse.
 *   https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html
 *
 * Component specs check each widget's own keys (arrows, Escape, Home and End).
 * This sweep only checks what every page owes a keyboard user.
 */

/** Our choice: a stop is "indicated" when one of these differs from the unfocused state. */
const RING_PROPS = ["outline-style", "outline-width", "outline-color", "box-shadow", "border-color", "background-color", "text-decoration-line"];

test.use({ locale: "en-US", timezoneId: "UTC" });
test.describe.configure({ timeout: 90_000 });

/** @param {import("@playwright/test").Page} page */
async function snapshot(page) {
  return page.evaluate((props) => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    // Hand Playwright's Tab presses a stable marker so a stop can be found again.
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) return null;
    if (!el.dataset.kbStop) {
      // A radio group is one stop: Tab lands on one radio, Shift+Tab may land on another.
      const group = el instanceof HTMLInputElement && el.type === "radio" && el.name ? [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)].filter((r) => r instanceof HTMLInputElement && r.form === el.form) : [el];
      const stop = String(new Set([...document.querySelectorAll("[data-kb-stop]")].map((n) => n instanceof HTMLElement && n.dataset.kbStop)).size);
      for (const member of group) if (member instanceof HTMLElement || member instanceof SVGElement) member.dataset.kbStop = stop;
    }
    document.querySelector("[data-kb-current]")?.removeAttribute("data-kb-current");
    el.dataset.kbCurrent = "";
    const rect = el.getBoundingClientRect();
    const cx = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
    const cy = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
    const hit = document.elementFromPoint(cx, cy);
    const visibleStyle = (/** @type {Element} */ node, /** @type {string | undefined} */ pseudo = undefined) => {
      const cs = getComputedStyle(node, pseudo);
      return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    };
    // The element and its three nearest ancestors: the focused element's ring, or a wrapper's :has(:focus-visible) ring.
    const chain = [visibleStyle(el, "::before"), visibleStyle(el, "::after")];
    for (let node = /** @type {Element | null} */ (el), i = 0; node && i < 4; node = node.parentElement, i++) chain.push(visibleStyle(node));
    const label = `${el.localName}${el.id ? `#${el.id}` : ""}${el.getAttribute("aria-label") ? `[aria-label="${el.getAttribute("aria-label")}"]` : ""} "${(el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`;
    return {
      stop: el.dataset.kbStop,
      label,
      focusVisible: el.matches(":focus-visible"),
      size: rect.width > 0 && rect.height > 0,
      onScreen: rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth,
      covered: hit !== null && hit !== el && !el.contains(hit) && !hit.contains(el) && !(el instanceof HTMLLabelElement),
      chain,
    };
  }, RING_PROPS);
}

/** Styles of the same element and ancestors with focus moved away. */
async function unfocused(/** @type {import("@playwright/test").Page} */ page) {
  return page.evaluate(
    (props) => {
      const el = document.querySelector("[data-kb-current]");
      if (!(el instanceof HTMLElement || el instanceof SVGElement)) return [];
      el.blur();
      const style = (/** @type {Element} */ node, /** @type {string | undefined} */ pseudo = undefined) => {
        const cs = getComputedStyle(node, pseudo);
        return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
      };
      const chain = [style(el, "::before"), style(el, "::after")];
      for (let node = /** @type {Element | null} */ (el), i = 0; node && i < 4; node = node.parentElement, i++) chain.push(style(node));
      return chain;
    },
    RING_PROPS,
  );
}

/** @param {Record<string, string>[]} focused @param {Record<string, string>[]} blurred */
const ringDiffers = (focused, blurred) =>
  focused.some((styles, i) =>
    RING_PROPS.some((prop) => {
      const before = blurred[i]?.[prop];
      if (styles[prop] === before) return false;
      if (prop === "outline-style") return styles[prop] !== "none";
      if (prop === "outline-width") return styles["outline-style"] !== "none" && parseFloat(styles[prop]) > 0;
      if (prop === "box-shadow") return styles[prop] !== "none";
      return true;
    }),
  );

for (const path of examples) {
  test(`${path}: Tab reaches every stop with a visible focus indicator`, async ({ page, baseURL }) => {
    const external = await blockExternalRequests(page, baseURL ?? "");
    await withoutMotion(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path, { waitUntil: "networkidle" });

    // An upper bound on presses (date fields and media controls take several): a sweep that runs past it has not come back around.
    const limit = await page.evaluate(() => document.querySelectorAll("a[href], area[href], button, input, select, textarea, summary, iframe, audio[controls], video[controls], [tabindex], [contenteditable]").length * 4 + 10);

    /** @type {{ stop: string, label: string }[]} */
    const stops = [];
    const problems = [];
    let wrapped = false;
    for (let i = 0; i < limit; i++) {
      await page.keyboard.press("Tab");
      // WebKit scrolls a newly focused element into view a frame later.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const now = await snapshot(page);
      if (!now) {
        // Focus left the document (to the browser chrome) or sits on body: the sweep has wrapped.
        if (stops.length) {
          wrapped = true;
          break;
        }
        continue;
      }
      if (stops.length && now.stop === stops[0].stop) {
        wrapped = true;
        break;
      }
      // Date fields and media controls take several Tab presses inside one element.
      if (now.stop === stops.at(-1)?.stop) continue;
      if (stops.some((s) => s.stop === now.stop)) {
        problems.push(`focus came back to ${now.label} before the page wrapped (a loop or trap)`);
        break;
      }
      stops.push({ stop: now.stop, label: now.label });
      if (!now.size) problems.push(`${now.label}: focused but has no size`);
      else if (!now.onScreen) problems.push(`${now.label}: focused but off screen`);
      else if (now.covered) problems.push(`${now.label}: focused but covered by another element`);
      const blurred = await unfocused(page);
      if (!ringDiffers(now.chain, blurred)) problems.push(`${now.label}: no visible focus indicator`);
      // Put focus back where it was, so the next Tab continues from here.
      await page.locator("[data-kb-current]").focus();
    }
    if (!wrapped && stops.length >= limit) problems.push(`Tab did not come back around after ${limit} presses (a keyboard trap?)`);
    expect(problems, problems.join("\n")).toEqual([]);

    // Shift+Tab from the last stop walks the same stops backwards.
    if (stops.length > 1) {
      const sample = stops.slice(-Math.min(stops.length, 8));
      await page.locator(`[data-kb-stop="${sample.at(-1)?.stop}"]`).first().focus();
      const back = [];
      for (let i = 0; back.length < sample.length - 1 && i < sample.length * 4; i++) {
        await page.keyboard.press("Shift+Tab");
        const stop = await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.dataset.kbStop : undefined));
        // Several presses inside one date field or media element count once.
        if (stop !== back.at(-1) && stop !== sample.at(-1)?.stop) back.push(stop);
      }
      expect(back, "Shift+Tab order").toEqual(sample.slice(0, -1).reverse().map((s) => s.stop));
    }
    expect(external, "pages must not leave the local server").toEqual([]);
  });
}
