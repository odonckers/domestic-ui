// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apps, selectedApps } from "./apps.js";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const schemes = /** @type {const} */ (["light", "dark"]);

/** Small phone viewports every view must fit without horizontal scrolling. */
const smallViewports = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
];

/** @param {import("@playwright/test").Page} page */
const axe = (page) => new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

/** Readable summary of axe violations for the failure message. */
const summarize = (violations) =>
  violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`).join("\n");

/**
 * Views expected to overflow at small sizes until a core fix lands.
 * dashboard: the chores table needs css/'s data-scroll="inline" region.
 */
const PENDING_TABLE_OVERFLOW = new Set(["dashboard"]);

/**
 * Elements wider than the viewport, and whether the page scrolls sideways.
 * Checks both the root scroller and body (WCAG 1.4.10 Reflow).
 * @param {import("@playwright/test").Page} page
 */
const measureOverflow = (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const { body } = document;
    const limit = root.clientWidth;
    const culprits = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > limit + 0.5)
      .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= limit + 0.5)
      .map((el) => {
        const id = el.id ? `#${el.id}` : "";
        return `${el.tagName.toLowerCase()}${id} (right edge ${Math.round(el.getBoundingClientRect().right)}px)`;
      });
    return {
      root: { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth },
      body: { scrollWidth: body.scrollWidth, clientWidth: body.clientWidth },
      culprits,
    };
  });

/** @param {Awaited<ReturnType<typeof measureOverflow>>} m */
const overflows = (m) => m.root.scrollWidth > m.root.clientWidth || m.body.scrollWidth > m.body.clientWidth;

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
  for (const { path, view, title } of apps[name].views) {
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

      for (const viewport of smallViewports) {
        const size = `${viewport.width}x${viewport.height}`;

        test(`fits ${size} without horizontal overflow`, async ({ page }) => {
          // The dashboard's chores table is wider than a phone; it overflows until
          // css/ ships the data-scroll="inline" region for wide tables (core
          // hotfix). Then wrap the table per its docs and delete this marker:
          // test.fail() errors as soon as the view stops overflowing.
          test.fail(PENDING_TABLE_OVERFLOW.has(view), "Waiting on the data-scroll=\"inline\" hotfix in css/");
          await page.setViewportSize(viewport);
          await page.goto(path, { waitUntil: "networkidle" });

          const closed = await measureOverflow(page);
          expect(overflows(closed), `horizontal overflow: ${JSON.stringify(closed)}`).toBe(false);

          await page.locator("details").evaluateAll((all) => all.forEach((d) => d.setAttribute("open", "")));
          const open = await measureOverflow(page);
          expect(overflows(open), `horizontal overflow with details open: ${JSON.stringify(open)}`).toBe(false);
        });

        for (const colorScheme of schemes) {
          test(`has no axe violations at ${size} (${colorScheme})`, async ({ page, baseURL }) => {
            const external = await blockExternalRequests(page, baseURL ?? "");
            await page.setViewportSize(viewport);
            await page.emulateMedia({ colorScheme });
            await page.goto(path, { waitUntil: "networkidle" });
            await expect(page).toHaveTitle(title);

            const { violations } = await axe(page);
            expect(violations, summarize(violations)).toEqual([]);

            await page.locator("details").evaluateAll((all) => all.forEach((d) => d.setAttribute("open", "")));
            const expanded = await axe(page);
            expect(expanded.violations, summarize(expanded.violations)).toEqual([]);

            expect(external, "external network requests").toEqual([]);
          });
        }
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

      test("applies the atoms the view uses", async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.locator('[data-text~="lead"]')).toHaveCount(1);
        await expect(page.locator('footer [data-text~="muted"]')).toHaveCount(1);

        if (view === "dashboard") {
          // A badge gets its tinted surface: not the page background, not transparent.
          const badge = page.locator("[data-badge]").first();
          await expect(badge).toBeVisible();
          const colors = await badge.evaluate((el) => ({
            badge: getComputedStyle(el).backgroundColor,
            page: getComputedStyle(document.documentElement).backgroundColor,
          }));
          expect(colors.badge).not.toEqual("rgba(0, 0, 0, 0)");
          expect(colors.badge).not.toEqual(colors.page);
        }

        if (view === "settings") {
          // The switch atom draws the checkbox itself.
          const toggle = page.locator('input[type="checkbox"][role="switch"]').first();
          await expect(toggle).toBeVisible();
          const appearance = await toggle.evaluate((el) => {
            const style = getComputedStyle(el);
            return style.appearance || style.getPropertyValue("-webkit-appearance");
          });
          expect(appearance).toEqual("none");
          await expect(page.getByRole("switch")).toHaveCount(3);
        }
      });
    });
  }
}
