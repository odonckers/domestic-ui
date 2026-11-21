// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apps, selectedApps } from "./apps.js";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const schemes = /** @type {const} */ (["light", "dark"]);

/** Apps whose HTML already holds the rendered view, so it works with JavaScript off. */
const prerendered = ["vanilla", "astro"];

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
        // The app shell is the chrome of every view, upgraded by <dui-app-shell> (it shows the Menu toggle).
        await expect(page.locator("dui-app-shell[data-app-shell]")).toHaveCount(1);
        await expect(page.locator('dui-app-shell > header > button[aria-controls="app-nav"]')).toBeVisible();
        await expect(page.locator('nav[aria-label="Main"] a[aria-current="page"]')).toHaveCount(1);

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

      test("links to the next view in the shell's main navigation", async ({ page }) => {
        // The next view in apps.js (wrapping), so every link gets followed from some view.
        const { views } = apps[name];
        const other = views[(views.findIndex((v) => v.path === path) + 1) % views.length];
        // The nav label is the title before " · Homebase".
        const label = other.title.split(" · ")[0];
        const nav = page.locator('nav[aria-label="Main"]');
        await page.goto(path, { waitUntil: "networkidle" });
        await nav.getByRole("link", { name: label, exact: true }).click();
        await expect(page).toHaveTitle(other.title);
        await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
        await expect(nav.locator('a[aria-current="page"]')).toHaveText(label);
        await expect(page.locator("h1")).toHaveCount(1);
      });

      test("applies the domestic-ui stylesheet", async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        // Settings has no .cluster: its buttons sit in the form's action bar, also a flex row from the layout layer.
        const flexRow = view === "settings" ? "form > [data-action-bar]" : ".cluster";
        const applied = await page.evaluate((flexRow) => ({
          spaceM: getComputedStyle(document.documentElement).getPropertyValue("--dui-space-m").trim(),
          clusterDisplay: getComputedStyle(/** @type {Element} */ (document.querySelector(flexRow))).display,
          skipLinkPosition: getComputedStyle(/** @type {Element} */ (document.querySelector('a[href="#main"]'))).position,
        }), flexRow);
        expect(applied.spaceM).not.toEqual("");
        expect(applied.clusterDisplay).toEqual("flex");
        // .visually-hidden (utilities layer) hides the skip link until it is focused.
        expect(applied.skipLinkPosition).toEqual("absolute");
      });

      test("applies the atoms the view uses", async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        // The orders view introduces itself in its page header instead of a lead paragraph.
        await expect(page.locator('[data-text~="lead"]')).toHaveCount(view === "orders" ? 0 : 1);
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
          // Four summary tiles and the chores tile across the whole row, laid out by the dashboard grid.
          await expect(page.locator("main div[data-dashboard] > section[aria-labelledby]")).toHaveCount(5);
          await expect(page.locator('main div[data-dashboard] > section[data-dashboard="full"] [data-scroll="inline"] > table[data-table]')).toHaveCount(1);
          const display = await page.locator("main div[data-dashboard]").evaluate((el) => getComputedStyle(el).display);
          expect(display).toEqual("grid");
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
          // Five headed sections and the form's action bar.
          await expect(page.locator("form[data-form-sections] > section[aria-labelledby] > header > h2")).toHaveCount(5);
          await expect(page.locator("form[data-form-sections] > footer[data-action-bar]:last-child")).toHaveCount(1);
        }

        if (view === "orders") {
          // Two typeahead fields, upgraded by <dui-combobox> when its script loaded.
          await expect(page.locator("dui-combobox")).toHaveCount(2);
          await expect(page.locator('dui-combobox input[role="combobox"]')).toHaveCount(2);
          await expect(page.locator("main header[data-page-header] > h1")).toHaveCount(1);
          await expect(page.locator('search[data-filter-bar] > form')).toHaveCount(1);
          await expect(page.locator('search[data-filter-bar] > [role="status"]')).toHaveText("8 orders");

          // The data table: <dui-table> adds sort buttons and the "select all" checkbox.
          await expect(page.locator('dui-table [data-scroll="inline"] > table[data-table]')).toHaveCount(1);
          await expect(page.locator("table[data-table] thead th button")).toHaveCount(7);
          await expect(page.getByRole("checkbox", { name: "Select all orders" })).toHaveCount(1);
          await expect(page.locator("table[data-table] tbody tr")).toHaveCount(8);

          // The density toggle is a drawn switch, and it sets data-density on the table's scroll region.
          const toggle = page.getByRole("switch", { name: "Compact table" });
          await expect(toggle).toBeVisible();
          const appearance = await toggle.evaluate((el) => {
            const style = getComputedStyle(el);
            return style.appearance || style.getPropertyValue("-webkit-appearance");
          });
          expect(appearance).toEqual("none");
          const region = page.locator('[data-scroll="inline"]:has(> table[data-table])');
          await expect(region).not.toHaveAttribute("data-density", "compact");
          await toggle.check();
          await expect(region).toHaveAttribute("data-density", "compact");
          await toggle.uncheck();
          await expect(region).not.toHaveAttribute("data-density", "compact");

          // A badge in the table gets its tinted surface.
          const badge = page.locator("table [data-badge]").first();
          await expect(badge).toBeVisible();
          const colors = await badge.evaluate((el) => ({
            badge: getComputedStyle(el).backgroundColor,
            page: getComputedStyle(document.documentElement).backgroundColor,
          }));
          expect(colors.badge).not.toEqual("rgba(0, 0, 0, 0)");
          expect(colors.badge).not.toEqual(colors.page);
        }
      });

      if (view === "orders") {
        test("filters rows and shows the chosen order in list-detail and the aux sidebar", async ({ page }) => {
          await page.goto(path, { waitUntil: "networkidle" });
          const aux = page.locator('dui-app-shell > aside[aria-label="Order details"]');
          const current = aux.locator('[data-list-detail] > nav a[aria-current="page"]');
          await expect(current).toHaveCount(1);
          await expect(current).toContainText("HB-1048");
          await expect(aux.locator("h2")).toHaveText("Order HB-1048");

          // An order number in the table shows that order.
          await page.locator("table[data-table] tbody").getByRole("link", { name: "HB-1045", exact: true }).click();
          await expect(aux.locator("h2")).toHaveText("Order HB-1045");
          await expect(current).toHaveCount(1);
          await expect(current).toContainText("HB-1045");

          // So does a link in the order list.
          await aux.locator("[data-list-detail] > nav").getByRole("link", { name: /HB-1042/ }).click();
          await expect(aux.locator("h2")).toHaveText("Order HB-1042");
          await expect(current).toContainText("HB-1042");
          expect(new URL(page.url()).pathname).toEqual(path);

          // The filter bar hides rows and updates its count.
          await page.getByLabel("Status").selectOption("Delivered");
          await page.getByRole("button", { name: "Apply", exact: true }).click();
          await expect(page.locator('search[data-filter-bar] > [role="status"]')).toHaveText("2 orders");
          await expect(page.locator("table[data-table] tbody tr:visible")).toHaveCount(2);
          await page.getByRole("button", { name: "Reset", exact: true }).click();
          await expect(page.locator('search[data-filter-bar] > [role="status"]')).toHaveText("8 orders");
        });
      }

      if (view === "orders" && prerendered.includes(name)) {
        test.describe("without JavaScript", () => {
          test.use({ javaScriptEnabled: false });
          test("shows every row, the order list and the default order", async ({ page }) => {
            await page.goto(path, { waitUntil: "networkidle" });
            await expect(page.locator("table[data-table] tbody tr:visible")).toHaveCount(8);
            await expect(page.locator("[data-list-detail] > nav a:visible")).toHaveCount(8);
            await expect(page.locator('[data-list-detail] > nav a[aria-current="page"]')).toContainText("HB-1048");
            await expect(page.locator('aside[aria-label="Order details"] h2')).toBeVisible();
            await expect(page.locator('aside[aria-label="Order details"] h2')).toHaveText("Order HB-1048");

            // Without the script the sidebars stack above and below main; they still fit 320px.
            await page.setViewportSize(smallViewports[0]);
            const m = await measureOverflow(page);
            expect(overflows(m), `horizontal overflow: ${JSON.stringify(m)}`).toBe(false);
          });
        });
      }
    });
  }
}
