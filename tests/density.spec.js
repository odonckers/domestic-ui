// @ts-check
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { examples, withoutMotion } from "./helpers.js";

/*
 * Density (css/tokens/semantic.css, section 4) and the page width token.
 * - data-density="compact" tightens control heights, padding and table cells; text size stays.
 * - Every interactive target in compact stays at least 24 by 24 CSS pixels (WCAG 2.5.8):
 *   https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
 *   A checkbox, radio or switch is targeted through its wrapping <label>, which is the
 *   click target (the label is part of the target, as in the WCAG examples).
 * - The density tokens are re-derived on every [data-density] scope, so a nested
 *   comfortable area gets the comfortable values back.
 * axe, html-validate and the small-screen checks pick up examples/patterns/density.html on their own.
 */

const PAGE = "examples/patterns/density.html";

test("the density example is picked up by every per-page check", () => {
  expect(examples).toContain(PAGE);
});

test.describe("density", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto(PAGE);
  });

  /** Computed values in one panel. @param {import("@playwright/test").Page} page @param {string} density */
  const measure = (page, density) =>
    page.locator(`.grid > .panel[data-density="${density}"]`).evaluate((panel) => {
      const px = (/** @type {Element} */ el, /** @type {string} */ prop) => Number.parseFloat(getComputedStyle(el).getPropertyValue(prop));
      const q = (/** @type {string} */ s) => /** @type {Element} */ (panel.querySelector(s));
      return {
        inputHeight: q("input[name='customer']").getBoundingClientRect().height,
        inputMin: px(q("input[name='customer']"), "min-block-size"),
        selectHeight: q("select").getBoundingClientRect().height,
        buttonHeight: q("button[type='submit']").getBoundingClientRect().height,
        toolbarButtonHeight: q("[role='toolbar'] button").getBoundingClientRect().height,
        checkLabelHeight: q("label:has(> input[type='checkbox']:not([role]))").getBoundingClientRect().height,
        switchLabelHeight: q("label:has(> [role='switch'])").getBoundingClientRect().height,
        cellPadding: px(q("td"), "padding-block-start"),
        cellPaddingInline: px(q("td"), "padding-inline-start"),
        fonts: ["input[name='customer']", "select", "button[type='submit']", "td", "th", "label", "h4", "[role='toolbar'] button"].map((s) => getComputedStyle(q(s)).fontSize),
      };
    });

  test("compact reduces control heights and table cell padding; text size is unchanged", async ({ page }) => {
    const comfortable = await measure(page, "comfortable");
    const compact = await measure(page, "compact");
    expect(comfortable.inputMin).toBe(44);
    expect(compact.inputMin).toBe(32);
    for (const key of /** @type {const} */ (["inputHeight", "selectHeight", "buttonHeight", "toolbarButtonHeight", "checkLabelHeight", "switchLabelHeight", "cellPadding", "cellPaddingInline"])) {
      expect(compact[key], key).toBeLessThan(comfortable[key]);
    }
    expect(compact.fonts).toEqual(comfortable.fonts);
  });

  test("with no attribute the page is comfortable", async ({ page }) => {
    const root = await page.evaluate(() => {
      const probe = document.createElement("input");
      probe.type = "text";
      document.body.append(probe);
      const value = getComputedStyle(probe).minBlockSize;
      probe.remove();
      return { value, scale: getComputedStyle(document.documentElement).getPropertyValue("--dui-density-scale").trim() };
    });
    expect(root.value).toBe("44px");
    expect(Number(root.scale)).toBe(1);
  });

  test("every interactive target in compact is at least 24 by 24 CSS pixels", async ({ page }) => {
    // Open the combobox so its options are measured too.
    await page.locator("#compact-carrier").focus();
    await page.keyboard.press("Alt+ArrowDown");
    await expect(page.locator("#compact-carrier-listbox")).toBeVisible();
    const small = await page.locator('.grid > .panel[data-density="compact"]').evaluate((panel) => {
      const targets = [...panel.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex], [role='option']")].map((el) =>
        el.matches("input[type='checkbox'], input[type='radio']") ? /** @type {Element} */ (el.closest("label")) : el,
      );
      return targets
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width < 24 || box.height < 24)
        .map(({ el, box }) => `${el.localName}${el.id ? `#${el.id}` : ""} "${(el.textContent ?? "").trim().slice(0, 30)}": ${box.width}×${box.height}`);
    });
    expect(small).toEqual([]);
  });

  test('a nested data-density="comfortable" restores the comfortable values', async ({ page }) => {
    const values = await page.evaluate(() => {
      const outer = document.createElement("div");
      outer.dataset.density = "compact";
      outer.innerHTML = `<button type="button">Compact</button><div data-density="comfortable"><button type="button">Comfortable</button><table><tr><td>Cell</td></tr></table></div><table><tr><td>Cell</td></tr></table>`;
      document.body.append(outer);
      const [compact, comfortable] = [...outer.querySelectorAll("button")].map((b) => getComputedStyle(b).minBlockSize);
      const [comfortableCell, compactCell] = [...outer.querySelectorAll("td")].map((td) => getComputedStyle(td).paddingBlockStart);
      const tokens = (/** @type {Element} */ el) => ["--dui-size-control", "--dui-space-cell", "--dui-space-control-block"].map((t) => getComputedStyle(el).getPropertyValue(t).trim());
      const out = { compact, comfortable, compactCell, comfortableCell, nestedTokens: tokens(/** @type {Element} */ (outer.querySelector("[data-density='comfortable']"))), rootTokens: tokens(document.documentElement) };
      outer.remove();
      return out;
    });
    expect(values.compact).toBe("32px");
    expect(values.comfortable).toBe("44px");
    expect(values.compactCell).toBe("4px");
    expect(values.comfortableCell).toBe("8px");
    expect(values.nestedTokens).toEqual(values.rootTokens);
  });

  test("a theme that changes --dui-size-target on a scope also moves the density tokens there", async ({ page }) => {
    const heights = await page.evaluate(() => {
      const scope = document.createElement("div");
      scope.dataset.theme = "probe";
      scope.style.setProperty("--dui-size-target", "3rem");
      scope.innerHTML = `<button type="button">Default</button><div data-density="compact"><button type="button">Compact</button></div>`;
      document.body.append(scope);
      const out = [...scope.querySelectorAll("button")].map((b) => getComputedStyle(b).minBlockSize);
      scope.remove();
      return out;
    });
    expect(heights).toEqual(["48px", "32px"]);
  });
});

test.describe("--dui-size-page", () => {
  test("no example page hard-codes 72rem", () => {
    for (const path of examples) expect(readFileSync(path, "utf8"), path).not.toContain("72rem");
  });

  test("the token resolves to 72rem and sets the page width", async ({ page }) => {
    await page.goto("examples/base.html");
    const { token, main } = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.inlineSize = "var(--dui-size-page)";
      document.body.append(probe);
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const token = Number.parseFloat(getComputedStyle(probe).inlineSize) / rem;
      probe.remove();
      return { token, main: getComputedStyle(/** @type {Element} */ (document.querySelector("body > main"))).maxInlineSize };
    });
    expect(token).toBe(72);
    expect(Number.parseFloat(main)).toBe(72 * 16);
  });
});
