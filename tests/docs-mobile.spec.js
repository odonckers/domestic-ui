// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { WCAG_TAGS, builtPages, summarize } from "./docs-helpers.js";

/*
 * Docs pages on small screens, in every Playwright project: no horizontal
 * page scroll (WCAG 1.4.10 Reflow) and no axe violations at 320×640 and
 * 375×812, and the Docs menu disclosure works by keyboard.
 */
const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
];

/**
 * Null when the page does not scroll sideways; otherwise the widths and the
 * element reaching furthest right. Content inside a [data-scroll="inline"]
 * region scrolls there, so only the region itself counts.
 */
function overflow() {
  const root = document.documentElement;
  const pre = [...document.querySelectorAll("main pre")].filter((p) => p.scrollWidth > p.clientWidth);
  if (root.scrollWidth <= root.clientWidth && !pre.length) return null;
  let worst = pre[0] ?? null;
  let right = root.clientWidth;
  for (const el of document.body.querySelectorAll("*")) {
    if (el.parentElement?.closest('[data-scroll="inline"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > right) [worst, right] = [el, r.right];
  }
  const name = worst
    ? `<${worst.localName}${worst.id ? `#${worst.id}` : ""}${worst.classList.length ? `.${[...worst.classList].join(".")}` : ""}> "${(worst.textContent ?? "").trim().slice(0, 60)}"`
    : "none found";
  return `scrollWidth ${root.scrollWidth} > clientWidth ${root.clientWidth}${pre.length ? `, ${pre.length} <pre> scroll sideways` : ""}; widest: ${name}, right edge at ${Math.round(right)}px`;
}

for (const path of builtPages) {
  test(`${path} reflows and has no axe violations at 320 and 375 CSS pixels`, async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto(`_site/${path}`);
      const result = await page.evaluate(overflow);
      expect(result, `${path} at ${viewport.width}px: ${result}`).toBeNull();
      // Framed render pages (live/) hold examples/ markup, checked by tests/a11y.spec.js and axe-checked on their own in tests/docs.spec.js; the frame itself is checked here.
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude("iframe").analyze();
      expect(violations, `${path} at ${viewport.width}px\n${summarize(violations)}`).toEqual([]);
    }
  });
}

test("the Docs menu opens and closes by keyboard at 375px and reaches the current page", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("_site/tokens/semantic.html");
  const menu = page.locator("details.docs-menu");
  const summary = menu.locator("summary");
  const nav = page.locator('nav[aria-label="Docs"]');
  const current = nav.locator('a[aria-current="page"]');

  // site.js closes the menu on narrow viewports.
  await expect(menu).not.toHaveAttribute("open");
  await expect(nav).toBeHidden();
  await expect(summary).toHaveText("Docs menu");
  // 44 CSS pixels, less sub-pixel rounding (Firefox reports 43.99…).
  expect((await summary.boundingBox())?.height ?? 0, "summary target size").toBeGreaterThanOrEqual(43.9);

  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("open", "");
  await expect(nav).toBeVisible();
  await page.keyboard.press("Space");
  await expect(menu).not.toHaveAttribute("open");
  await expect(nav).toBeHidden();
  await page.keyboard.press("Space");
  await expect(menu).toHaveAttribute("open", "");

  // Tab from the summary to the current page link. WebKit skips links on Tab unless Option is held.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  for (let i = 0; i < 100 && !(await current.evaluate((a) => a === document.activeElement)); i++) await page.keyboard.press(tab);
  await expect(current).toBeFocused();
  await expect(current).toBeInViewport();
  expect((await current.boundingBox())?.height ?? 0, "link target size").toBeGreaterThanOrEqual(43.9);
});

test("the Docs menu is an open sidebar beside main on wide screens", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("_site/tokens/semantic.html");
  await expect(page.locator("details.docs-menu")).toHaveAttribute("open", "");
  await expect(page.locator("details.docs-menu > summary")).toBeHidden();
  const nav = await page.locator('nav[aria-label="Docs"]').boundingBox();
  const main = await page.locator("main").boundingBox();
  expect(nav && main && nav.x + nav.width <= main.x, "sidebar is beside main").toBe(true);
});
