// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { WCAG_TAGS, builtPages, summarize } from "./docs-helpers.js";

/*
 * Docs pages on small screens, in every Playwright project: no horizontal
 * page scroll (WCAG 1.4.10 Reflow), header diagrams no wider than the
 * content column, and no axe violations at 320×640 and 375×812, and the
 * Docs sidebar works as a drawer by keyboard.
 */
const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
];

/**
 * Null when the page does not scroll sideways; otherwise the widths and the
 * element reaching furthest right. Content inside a [data-scroll="inline"]
 * region scrolls there, so only the region itself counts; a <pre> may
 * scroll only when it is such a region.
 */
function overflow() {
  const root = document.documentElement;
  // A code block scrolls only as its own named region (data-scroll="inline", role="region", tabindex="0").
  const pre = [...document.querySelectorAll("main pre:not([data-scroll~='inline'][role='region'][tabindex='0'][aria-label])")].filter((p) => p.scrollWidth > p.clientWidth);
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
      // The header diagram (element and pattern pages) scales down to the content column.
      const diagram = await page.evaluate(() => {
        const svg = document.querySelector("figure.docs-diagram > svg");
        const column = document.querySelector("main .docs-content");
        return svg && column ? { svg: svg.getBoundingClientRect().width, column: column.clientWidth } : null;
      });
      if (diagram) expect(diagram.svg, `${path} at ${viewport.width}px: diagram wider than the content column`).toBeLessThanOrEqual(diagram.column);
      // Framed render pages (live/) hold examples/ markup, checked by tests/a11y.spec.js and axe-checked on their own in tests/docs.spec.js; the frame itself is checked here.
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude("iframe").analyze();
      expect(violations, `${path} at ${viewport.width}px\n${summarize(violations)}`).toEqual([]);
    }
  });
}

test("at 375px the Menu button opens the Docs sidebar as a modal drawer by keyboard, Esc closes it and focus returns", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("_site/tokens/semantic.html");
  const menu = page.getByRole("button", { name: "Menu" });
  const nav = page.locator('nav[aria-label="Docs"]');
  const current = nav.locator('a[aria-current="page"]');

  // dui-app-shell shows the toggle and keeps the sidebar out of the page while it does not fit beside main.
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("aria-controls", "docs-nav");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();
  // 44 CSS pixels, less sub-pixel rounding (Firefox reports 43.99…).
  expect((await menu.boundingBox())?.height ?? 0, "button target size").toBeGreaterThanOrEqual(43.9);

  await menu.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Menu" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute("data-dialog", "drawer start");
  expect(await drawer.evaluate((d) => d.matches(":modal")), "a modal dialog").toBe(true);
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(drawer.locator('nav[aria-label="Docs"]')).toBeVisible();
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute("href", "semantic.html");

  // Tab reaches the current page link inside the drawer. WebKit skips links on Tab unless Option is held.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  for (let i = 0; i < 100 && !(await current.evaluate((a) => a === document.activeElement)); i++) await page.keyboard.press(tab);
  await expect(current).toBeFocused();
  await expect(current).toBeInViewport();
  expect((await current.boundingBox())?.height ?? 0, "link target size").toBeGreaterThanOrEqual(43.9);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();
});

test("at 1280px the Docs sidebar sits beside main, only the current group is open, and it is not an ARIA menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("_site/tokens/semantic.html");
  const nav = page.locator('nav[aria-label="Docs"]');
  await expect(nav).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true");
  const navBox = await nav.boundingBox();
  const mainBox = await page.locator("main").boundingBox();
  expect(navBox && mainBox && navBox.x + navBox.width <= mainBox.x, "sidebar is beside main").toBe(true);
  const open = nav.locator("details[open]");
  await expect(open).toHaveCount(1);
  await expect(open.locator("> summary")).toHaveText("Tokens");
  await expect(open.locator('a[aria-current="page"]')).toBeVisible();
  await expect(open.locator('a[aria-current="page"]')).toBeInViewport();
  await expect(page.locator('[role="menu"], [role="menubar"], [role="menuitem"]')).toHaveCount(0);
  // The page itself did not scroll to show the link.
  expect(await page.evaluate(() => scrollY)).toBe(0);

  // A page low in the sidebar: site.js scrolls the sidebar (not the page) so its link is on screen.
  await page.goto("_site/patterns/typeahead.html");
  await expect(nav.locator('a[aria-current="page"]')).toBeInViewport({ ratio: 1 });
  expect(await nav.evaluate((n) => n.scrollTop), "the sidebar scrolled").toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

// Owen's rule: an accent edge on the leading side is straight (nav.css, alerts and anything site.css draws).
test("coloured leading edges are straight: no start-side radius on a thick start border, no exceptions", async ({ page }) => {
  for (const path of ["index.html", "components/atoms/button.html", "patterns/alerts.html", "tokens/semantic.html"]) {
    await page.goto(`_site/${path}`);
    const curved = await page.evaluate(() =>
      [...document.querySelectorAll("body *")].flatMap((el) => {
        const s = getComputedStyle(el);
        if (!(parseFloat(s.borderInlineStartWidth) > 1) || s.borderInlineStartStyle === "none") return [];
        if (s.borderInlineStartColor === "transparent" || /rgba\(.*,\s*0\)$/.test(s.borderInlineStartColor)) return [];
        if (s.borderStartStartRadius === "0px" && s.borderEndStartRadius === "0px") return [];
        return [`<${el.localName}${el.className ? `.${String(el.className).trim().split(/\s+/).join(".")}` : ""}> radii ${s.borderStartStartRadius} / ${s.borderEndStartRadius}`];
      }),
    );
    expect(curved, path).toEqual([]);
  }
});
