// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { examples, schemes, blockExternalRequests, WCAG_TAGS, summarize } from "./helpers.js";

/** @param {import("@playwright/test").Page} page */
const axe = (page) => new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

for (const path of examples) {
  test.describe(path, () => {
    for (const colorScheme of schemes) {
      test(`has no axe violations (${colorScheme})`, async ({ page, baseURL }) => {
        const external = await blockExternalRequests(page, baseURL ?? "");
        await page.emulateMedia({ colorScheme });
        await page.goto(path, { waitUntil: "networkidle" });

        const { violations } = await axe(page);
        expect(violations, summarize(violations)).toEqual([]);

        // Open dialogs and details too, so their contents are checked.
        for (const opener of await page.locator('button[command="show-modal"]').all()) {
          await opener.click();
          const dialog = page.locator("dialog[open]");
          await expect(dialog).toBeVisible();
          const open = await axe(page);
          expect(open.violations, summarize(open.violations)).toEqual([]);
          await page.keyboard.press("Escape");
          await expect(dialog).toHaveCount(0);
          await expect(opener).toBeFocused();
        }
        await page.locator("details").evaluateAll((all) => all.forEach((d) => d.setAttribute("open", "")));
        const expanded = await axe(page);
        expect(expanded.violations, summarize(expanded.violations)).toEqual([]);

        expect(external, "external network requests").toEqual([]);
      });
    }

    test("renders differently in light and dark", async ({ page }) => {
      const sample = async (colorScheme) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        return page.evaluate(() => {
          const body = getComputedStyle(document.body);
          const root = getComputedStyle(document.documentElement);
          return { background: root.backgroundColor, color: body.color };
        });
      };
      const light = await sample("light");
      const dark = await sample("dark");
      expect(light.background).not.toEqual(dark.background);
      expect(light.color).not.toEqual(dark.color);
    });
  });
}

test("data-color-scheme forces a scheme regardless of the user preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("examples/base.html");
  const light = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  await page.evaluate(() => document.documentElement.setAttribute("data-color-scheme", "dark"));
  const forcedDark = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(forcedDark).not.toEqual(light);

  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => document.documentElement.setAttribute("data-color-scheme", "light"));
  const forcedLight = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(forcedLight).toEqual(light);
});
