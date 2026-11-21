// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { examples, schemes, WCAG_TAGS, summarize } from "./helpers.js";

/*
 * Small screens: no example may scroll sideways (WCAG 1.4.10 Reflow,
 * https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), and each stays
 * axe-clean at that size, where code blocks and tables start to scroll.
 * Wide content belongs in data-scroll="inline" or a <pre>, which scroll on their own.
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
              .filter((el) => !el.parentElement?.closest("[data-scroll], pre"))
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
