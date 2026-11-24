// @ts-check
import { statSync } from "node:fs";
import { test, expect } from "@playwright/test";
// Builds _site/ when this file is collected, so the docs pages are served at /_site/.
import "./docs-helpers.js";

/*
 * Type scale and the optional self-hosted Inter (css/fonts/inter.css).
 * WCAG 1.4.4 Resize Text: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
 * WCAG 1.4.12 Text Spacing: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
 * font-display: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display
 */

/** @param {import("@playwright/test").Page} page */
const fontRequests = (page) => {
  /** @type {string[]} */
  const urls = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font" || /\.(woff2?|ttf|otf)(\?|$)/.test(request.url())) urls.push(request.url());
  });
  return urls;
};

test("css/domestic.css alone makes no font request", async ({ page }) => {
  const urls = fontRequests(page);
  await page.goto("examples/base.html");
  await page.evaluate(() => document.fonts.ready);
  expect(urls).toEqual([]);
});

test("with the Inter opt-in, only same-origin woff2 files load, and the Latin file is 120 KB or less", async ({ page, baseURL }) => {
  const urls = fontRequests(page);
  await page.goto("_site/index.html");
  await page.evaluate(() => document.fonts.ready);
  expect(urls.length).toBeGreaterThan(0);
  for (const url of urls) {
    expect(url.startsWith(/** @type {string} */ (baseURL)), url).toBe(true);
    expect(url).toMatch(/\.woff2$/);
  }
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily.toLowerCase())).toContain("inter");
  const latin = statSync(new URL("../css/fonts/inter-latin.woff2", import.meta.url)).size;
  expect(latin).toBeLessThanOrEqual(120 * 1024);
  expect(statSync(new URL("../css/fonts/OFL.txt", import.meta.url)).size).toBeGreaterThan(0);
});

test("UI text is 14px and scales with the browser font size; page titles stay at 30px or less", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("examples/app-shell.html");
  const read = () =>
    page.evaluate(() => {
      const probe = document.createElement("div");
      document.body.append(probe);
      probe.style.fontSize = "var(--dui-font-size-ui)";
      const ui = Number.parseFloat(getComputedStyle(probe).fontSize);
      probe.style.fontSize = "var(--dui-font-size-page-title)";
      const title = Number.parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const h1 = Number.parseFloat(getComputedStyle(/** @type {Element} */ (document.querySelector("main h1"))).fontSize);
      return { ui, title, root, h1 };
    });
  const normal = await read();
  expect(normal.ui).toBe(14);
  expect(normal.title).toBeLessThanOrEqual(30);
  expect(normal.h1).toBe(normal.title);
  // Twice the root size (a user's larger default font size): UI text doubles too.
  await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%"));
  const large = await read();
  expect(large.ui).toBe(28);
  expect(large.title / large.root).toBeLessThanOrEqual(1.875);
});

test("headings balance and table numbers are tabular", async ({ page }) => {
  await page.goto("examples/base.html");
  const out = await page.evaluate(() => ({
    wrap: getComputedStyle(/** @type {Element} */ (document.querySelector("h1"))).textWrap,
    nums: getComputedStyle(/** @type {Element} */ (document.querySelector("td"))).fontVariantNumeric,
  }));
  expect(out.wrap).toMatch(/balance/);
  expect(out.nums).toContain("tabular-nums");
});
