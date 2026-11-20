// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apps, selectedApps } from "./apps.js";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const schemes = /** @type {const} */ (["light", "dark"]);

/** @param {import("@playwright/test").Page} page */
const axe = (page) => new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

/** Readable summary of axe violations for the failure message. */
const summarize = (violations) =>
  violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`).join("\n");

/**
 * Fail the test on any request that leaves the local server.
 * @param {import("@playwright/test").Page} page
 * @param {string} baseURL
 */
async function blockExternalRequests(page, baseURL) {
  const external = [];
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(baseURL)) return route.continue();
    external.push(url);
    return route.abort();
  });
  return external;
}

for (const name of selectedApps()) {
  for (const { path, title } of apps[name].views) {
    test.describe(`[${name}] ${path}`, () => {
      for (const colorScheme of schemes) {
        test(`has no axe violations (${colorScheme})`, async ({ page, baseURL }) => {
          const external = await blockExternalRequests(page, baseURL ?? "");
          await page.emulateMedia({ colorScheme });
          await page.goto(path, { waitUntil: "networkidle" });
          await expect(page).toHaveTitle(title);

          const { violations } = await axe(page);
          expect(violations, summarize(violations)).toEqual([]);

          // Open every <details> so its contents are checked too.
          await page.locator("details").evaluateAll((all) => all.forEach((d) => d.setAttribute("open", "")));
          const expanded = await axe(page);
          expect(expanded.violations, summarize(expanded.violations)).toEqual([]);

          expect(external, "external network requests").toEqual([]);
        });
      }

      test("has the page structure every view shares", async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("main#main")).toHaveCount(1);
        await expect(page.locator('nav[aria-label="Primary"] a[aria-current="page"]')).toHaveCount(1);

        // The first Tab stop is the skip link, and it shows itself on focus.
        await page.keyboard.press("Tab");
        const skip = page.getByRole("link", { name: "Skip to main content" });
        await expect(skip).toBeFocused();
        await expect(skip).toHaveAttribute("href", "#main");
        const width = await skip.evaluate((a) => a.getBoundingClientRect().width);
        expect(width).toBeGreaterThan(1);

        // Following it stays on this view and targets main (a <base href> can break this).
        const before = new URL(page.url());
        await page.keyboard.press("Enter");
        await expect(page.locator("main:target")).toHaveCount(1);
        const after = new URL(page.url());
        expect(after.pathname).toEqual(before.pathname);
        expect(after.hash).toEqual("#main");
      });

      test("links to the other view in the primary nav", async ({ page }) => {
        const other = apps[name].views.find((view) => view.path !== path);
        await page.goto(path, { waitUntil: "networkidle" });
        await page.locator('nav[aria-label="Primary"] a:not([aria-current])').click();
        await expect(page).toHaveTitle(other?.title ?? "");
        await expect(page.locator('nav[aria-label="Primary"] a[aria-current="page"]')).toHaveCount(1);
        await expect(page.locator("h1")).toHaveCount(1);
      });

      test("applies the domestic-ui stylesheet", async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        const applied = await page.evaluate(() => ({
          spaceM: getComputedStyle(document.documentElement).getPropertyValue("--dui-space-m").trim(),
          clusterDisplay: getComputedStyle(/** @type {Element} */ (document.querySelector(".cluster"))).display,
          skipLinkPosition: getComputedStyle(/** @type {Element} */ (document.querySelector('a[href="#main"]'))).position,
        }));
        expect(applied.spaceM).not.toEqual("");
        expect(applied.clusterDisplay).toEqual("flex");
        // .visually-hidden (utilities layer) hides the skip link until it is focused.
        expect(applied.skipLinkPosition).toEqual("absolute");
      });
    });
  }
}
