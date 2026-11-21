// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { examples, schemes, WCAG_TAGS, summarize } from "./helpers.js";

/*
 * Small screens: no example may scroll sideways (WCAG 1.4.10 Reflow,
 * https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), and each stays
 * axe-clean at that size, where code blocks and tables start to scroll.
 * Wide content belongs in data-scroll="inline", which scrolls on its own; a <pre> wraps.
 */
const viewports = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
];

for (const viewport of viewports) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    for (const path of examples) {
      test.describe(path, () => {
        test("does not scroll sideways", async ({ page }) => {
          await page.goto(path);
          const { scrollWidth, clientWidth, offenders } = await page.evaluate(() => {
            const root = document.documentElement;
            const offenders = [...document.body.querySelectorAll("*")]
              // Content inside a scroll container may be wider; the container itself may not.
              .filter((el) => !el.parentElement?.closest("[data-scroll]"))
              .filter((el) => el.getBoundingClientRect().right > root.clientWidth + 0.5)
              .map((el) => {
                const id = el.id ? `#${el.id}` : "";
                const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
                return `${el.localName}${id} (right edge ${Math.round(el.getBoundingClientRect().right)}px): "${text}"`;
              });
            return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, offenders };
          });
          expect(scrollWidth, `wider than ${clientWidth}px:\n  ${offenders.join("\n  ")}`).toBeLessThanOrEqual(clientWidth);
        });

        // WCAG 2.1.1 Keyboard: https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html
        test("every scrollable region is keyboard-focusable", async ({ page }) => {
          await page.goto(path);
          const { scrolling, pres } = await page.evaluate(() => {
            const describe = (el) => {
              const id = el.id ? `#${el.id}` : "";
              const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
              return `${el.localName}${id}: "${text}"`;
            };
            const scrolling = [...document.querySelectorAll("pre, [data-scroll]")]
              .filter((el) => el.scrollWidth > el.clientWidth)
              .filter((el) => /** @type {HTMLElement} */ (el).tabIndex < 0)
              .map(describe);
            // A <pre> wraps by default; one that opts in to data-scroll may overflow at some
            // viewport, so it needs tabindex="0" and a name regardless of size.
            const pres = [...document.querySelectorAll("pre[data-scroll]")]
              .filter((el) => el.getAttribute("tabindex") !== "0" || !(el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")))
              .map(describe);
            return { scrolling, pres };
          });
          expect(scrolling, `scrollable but not focusable:\n  ${scrolling.join("\n  ")}`).toEqual([]);
          expect(pres, `<pre data-scroll> without tabindex="0" or a name:\n  ${pres.join("\n  ")}`).toEqual([]);
        });

        for (const colorScheme of schemes) {
          test(`has no axe violations (${colorScheme})`, async ({ page }) => {
            await page.emulateMedia({ colorScheme });
            await page.goto(path);
            const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
            expect(violations, summarize(violations)).toEqual([]);
          });
        }
      });
    }
  });
}
