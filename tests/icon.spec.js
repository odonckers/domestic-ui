// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { schemes, withoutMotion, WCAG_TAGS, summarize } from "./helpers.js";

/*
 * Icon atom (css/components/atoms/icon.css) and icon-only buttons
 * (data-button="icon" in button.css) on examples/atoms/icon.html: names,
 * target sizes, the <dui-tooltip> that repeats the name (WCAG 1.4.13),
 * decorative SVGs, currentColor in forced colors, and axe with every
 * tooltip shown. PRINCIPLES.md, Icons, has the rules.
 */

const PAGE = "examples/atoms/icon.html";
const ICON_ONLY = ["Search", "Close", "More actions"];

/** @param {import("@playwright/test").Page} page */
const axe = (page) => new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

/** @param {import("@playwright/test").Page} page @param {string} name */
const iconButton = (page, name) => page.locator('[data-button~="icon"]').filter({ has: page.getByText(name, { exact: true }) });

test.describe("icon-only buttons", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto(PAGE);
  });

  test("are named for the action by text inside the button, and the tooltip repeats it", async ({ page }) => {
    const buttons = page.locator('[data-button~="icon"]');
    await expect(buttons).toHaveCount(ICON_ONLY.length);
    for (const name of ICON_ONLY) {
      const button = iconButton(page, name);
      await expect(button).toHaveAccessibleName(name);
      await expect(button).not.toHaveAttribute("aria-label");
      // The tooltip is a visual copy of the name, hidden from assistive technology so it is not read twice.
      const tip = button.locator("xpath=following-sibling::*[@role='tooltip']");
      await expect(tip).toHaveText(name);
      await expect(tip).toHaveAttribute("aria-hidden", "true");
      await expect(tip).toHaveAttribute("popover", "hint");
    }
  });

  for (const density of /** @type {const} */ (["comfortable", "compact"])) {
    test(`are square targets of at least 24 by 24 pixels (${density})`, async ({ page }) => {
      await page.evaluate((d) => document.documentElement.setAttribute("data-density", d), density);
      for (const name of ICON_ONLY) {
        const box = await iconButton(page, name).boundingBox();
        expect(box, name).not.toBeNull();
        expect(box?.width, name).toBeGreaterThanOrEqual(density === "compact" ? 32 : 36);
        expect(box?.height, name).toBeGreaterThanOrEqual(24);
        expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0)), `${name} is square`).toBeLessThan(1);
      }
    });
  }

  test("the tooltip shows on keyboard focus and Esc hides it without moving focus", async ({ page }) => {
    for (const name of ICON_ONLY) {
      const button = iconButton(page, name);
      const tip = button.locator("xpath=following-sibling::*[@role='tooltip']");
      await expect(tip).toBeHidden();
      await button.focus();
      await expect(tip).toBeVisible();
      await expect(tip).toHaveText(name);
      await page.keyboard.press("Escape");
      await expect(tip).toBeHidden();
      await expect(button).toBeFocused();
    }
    // Tab moves on: the next button's tooltip replaces the last one.
    await iconButton(page, "Search").focus();
    await page.keyboard.press("Tab");
    await expect(iconButton(page, "Close")).toBeFocused();
    await expect(page.locator("[role='tooltip']:popover-open")).toHaveText("Close");
  });

  test("the tooltip shows on hover, stays while the pointer moves onto it, and Esc hides it", async ({ page }) => {
    const button = iconButton(page, "More actions");
    const tip = button.locator("xpath=following-sibling::*[@role='tooltip']");
    await button.hover();
    await expect(tip).toBeVisible();
    const box = await tip.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(300);
    await expect(tip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
    await button.hover();
    await page.mouse.move(5, 5);
    await expect(tip).toBeHidden();
  });
});

test.describe("icons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test("icons in buttons and links are decorative and sized --dui-size-icon-inline in buttons, --dui-size-icon elsewhere", async ({ page }) => {
    const icons = page.locator("main :is(button, a) svg");
    expect(await icons.count()).toBeGreaterThanOrEqual(6);
    for (const icon of await icons.all()) {
      await expect(icon).toHaveAttribute("data-icon");
      await expect(icon).toHaveAttribute("aria-hidden", "true");
      await expect(icon).toHaveAttribute("focusable", "false");
      const size = await icon.evaluate((el) => {
        const probe = document.createElement("div");
        probe.style.inlineSize = el.closest("button, a[data-button]") ? "var(--dui-size-icon-inline)" : "var(--dui-size-icon)";
        document.body.append(probe);
        const want = probe.getBoundingClientRect().width;
        probe.remove();
        const box = el.getBoundingClientRect();
        return { width: box.width, height: box.height, want };
      });
      expect(size.width).toBeCloseTo(size.want, 0);
      expect(size.height).toBeCloseTo(size.want, 0);
    }
  });

  test("labelled buttons and nav links keep their visible text as the name", async ({ page }) => {
    const labelled = page.locator("main button:not([data-button~='icon'])", { hasText: "Search" });
    await expect(labelled).toBeVisible();
    await expect(labelled).toHaveAccessibleName("Search");
    await expect(page.getByRole("link", { name: "Back", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Example" }).getByRole("link", { name: "Home" })).toBeVisible();
  });

  test('data-icon="mirror" flips only in right-to-left text', async ({ page }) => {
    const scale = (selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).scale);
    expect(await scale('svg[data-icon~="mirror"]')).toBe("none");
    await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    expect(await scale('svg[data-icon~="mirror"]')).toBe("-1 1");
    expect(await scale('[data-button~="icon"] svg')).toBe("none");
  });

  for (const forcedColors of /** @type {const} */ (["none", "active"])) {
    test(`strokes follow currentColor and stay visible (forced colors: ${forcedColors})`, async ({ page, browserName }) => {
      test.skip(forcedColors === "active" && browserName !== "chromium", "forced-colors emulation is Chromium-only in Playwright");
      await page.emulateMedia({ forcedColors });
      for (const icon of await page.locator("main svg[data-icon]").all()) {
        const paint = await icon.evaluate((el) => {
          const style = getComputedStyle(el);
          const holder = el.parentElement ?? el;
          let node = holder;
          let background = "rgba(0, 0, 0, 0)";
          while (node && background === "rgba(0, 0, 0, 0)") {
            background = getComputedStyle(node).backgroundColor;
            node = node.parentElement;
          }
          return { stroke: style.stroke, color: style.color, holderColor: getComputedStyle(holder).color, background };
        });
        expect(paint.stroke).toBe(paint.color);
        expect(paint.color).toBe(paint.holderColor);
        expect(paint.stroke).not.toBe(paint.background);
      }
    });
  }
});

test.describe("app shell icons", () => {
  test("are Lucide SVGs with the data-icon hook, decorative, beside visible text", async ({ page }) => {
    await page.goto("examples/app-shell.html");
    const icons = page.locator("dui-app-shell svg");
    await expect(icons).toHaveCount(8);
    for (const icon of await icons.all()) {
      await expect(icon).toHaveAttribute("data-icon");
      await expect(icon).toHaveAttribute("aria-hidden", "true");
      const text = await icon.evaluate((el) => el.parentElement?.textContent?.trim() ?? "");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

const modes = [...schemes.map((colorScheme) => ({ colorScheme, forcedColors: /** @type {const} */ ("none") })), { colorScheme: /** @type {const} */ ("light"), forcedColors: /** @type {const} */ ("active") }];

for (const { colorScheme, forcedColors } of modes) {
  const label = forcedColors === "active" ? "forced colors" : colorScheme;
  test(`${PAGE} has no axe violations, with each tooltip shown (${label})`, async ({ page, browserName }) => {
    test.skip(forcedColors === "active" && browserName !== "chromium", "forced-colors emulation is Chromium-only in Playwright");
    await withoutMotion(page);
    await page.emulateMedia({ colorScheme, forcedColors });
    await page.goto(PAGE, { waitUntil: "networkidle" });
    const { violations } = await axe(page);
    expect(violations, summarize(violations)).toEqual([]);
    for (const name of ICON_ONLY) {
      await iconButton(page, name).focus();
      await expect(page.locator("[role='tooltip']:popover-open")).toHaveCount(1);
      const shown = await axe(page);
      expect(shown.violations, `${name} tooltip\n${summarize(shown.violations)}`).toEqual([]);
    }
  });
}
