// @ts-check
import { test, expect } from "@playwright/test";
import { examples, withoutMotion } from "./helpers.js";

/*
 * Organisms in css/components/organisms/: page header, filter bar, form sections (large forms).
 * - Each switches with a container query on its own box: compared at 1280 and 360 wide.
 * - Filter bar: the role="status" result count is in the page from load
 *   (WCAG 4.1.3: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), every
 *   control has a label, and the count changes when filters are applied.
 * - Every interactive target on the new layout and organism pages stays at least 24 by 24
 *   CSS pixels with data-density="compact" (WCAG 2.5.8:
 *   https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
 * axe (labels included), html-validate and the 320/375 overflow checks pick these pages up on their own.
 */

const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 360, height: 800 };
const ORGANISMS = ["index", "page-header", "filter-bar", "large-forms", "data-table"].map((n) => `examples/organisms/${n}.html`);
const LAYOUTS = ["index", "list-detail", "split", "dashboard", "action-bar", "settings", "app-shell"].map((n) => `examples/layouts/${n}.html`);

test("the organism examples are picked up by every per-page check", () => {
  for (const path of ORGANISMS) expect(examples).toContain(path);
});

/** @param {import("@playwright/test").Locator} locator */
const box = async (locator) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error("not rendered");
  return b;
};

test.describe("page header", () => {
  const header = "[data-page-header]:has(> nav)";

  test("actions sit beside the title when wide", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(ORGANISMS[1]);
    const title = await box(page.locator(`${header} > h3`));
    const actions = await box(page.locator(`${header} > div`));
    const crumb = await box(page.locator(`${header} > nav`));
    expect(actions.x).toBeGreaterThan(title.x + title.width);
    expect(actions.y).toBeGreaterThanOrEqual(crumb.y + crumb.height - 1);
    expect(actions.y).toBeLessThan(title.y + title.height);
  });

  test("actions wrap under the title and description when narrow", async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto(ORGANISMS[1]);
    const title = await box(page.locator(`${header} > h3`));
    const description = await box(page.locator(`${header} > p`));
    const actions = await box(page.locator(`${header} > div`));
    expect(actions.y).toBeGreaterThanOrEqual(description.y + description.height - 1);
    expect(actions.x).toBeCloseTo(title.x, 0);
  });
});

test.describe("filter bar", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
  });

  test("the result count is a status message in the page from load", async ({ page }) => {
    await page.goto(ORGANISMS[2]);
    // The combobox adds a status region of its own; the count is the bar's direct child.
    const status = page.locator("[data-filter-bar][aria-label='Filter orders'] > [role='status']");
    await expect(status).toHaveRole("status");
    await expect(status).toHaveCount(1);
    await expect(status).toHaveText("6 orders");
  });

  test("every control is labelled", async ({ page }) => {
    await page.goto(ORGANISMS[2]);
    for (const label of ["Search orders", "Status", "Customer", "Placed on or after"]) {
      await expect(page.getByRole("search", { name: "Filter orders" }).getByLabel(label, { exact: true }).and(page.locator("input, select"))).toHaveCount(1);
    }
  });

  test("Apply filters the list and updates the count; Reset restores it", async ({ page }) => {
    await page.goto(ORGANISMS[2]);
    const bar = page.getByRole("search", { name: "Filter orders" });
    await bar.getByLabel("Status", { exact: true }).selectOption("Open");
    await bar.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator("#order-count")).toHaveText("2 orders");
    await expect(page.locator("#order-table tbody tr:not([hidden])")).toHaveCount(2);
    await bar.getByRole("button", { name: "Reset" }).click();
    await expect(page.locator("#order-count")).toHaveText("6 orders");
  });

  test("controls share a row when wide and take a row each when narrow", async ({ page }) => {
    const fields = (/** @type {import("@playwright/test").Page} */ p) => p.locator("[data-filter-bar][aria-label='Filter orders'] > form > *");
    await page.setViewportSize(WIDE);
    await page.goto(ORGANISMS[2]);
    const [a, b] = [await box(fields(page).nth(0)), await box(fields(page).nth(1))];
    expect(b.x).toBeGreaterThan(a.x + a.width);
    await page.setViewportSize(NARROW);
    const [c, d] = [await box(fields(page).nth(0)), await box(fields(page).nth(1))];
    expect(d.y).toBeGreaterThanOrEqual(c.y + c.height);
    expect(d.x).toBeCloseTo(c.x, 0);
  });
});

test.describe("form sections", () => {
  const section = "[data-form-sections] > section:first-of-type";

  test("the heading sits beside the fields when wide, above them when narrow", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(ORGANISMS[3]);
    let header = await box(page.locator(`${section} > header`));
    let body = await box(page.locator(`${section} > div`));
    expect(body.x).toBeGreaterThan(header.x + header.width);
    expect(Math.abs(body.y - header.y)).toBeLessThan(2);

    await page.setViewportSize(NARROW);
    header = await box(page.locator(`${section} > header`));
    body = await box(page.locator(`${section} > div`));
    expect(body.y).toBeGreaterThanOrEqual(header.y + header.height);
  });

  test("fields form a grid when wide; text areas and groups take the whole row", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(ORGANISMS[3]);
    const fields = page.locator("[data-form-sections] > section:nth-of-type(2) > div > *");
    const [a, b] = [await box(fields.nth(0)), await box(fields.nth(1))];
    expect(b.x).toBeGreaterThan(a.x + a.width);
    const payment = page.locator("[data-form-sections] > section:nth-of-type(4) > div");
    const [group, notes, body] = [await box(payment.locator("fieldset")), await box(payment.locator("[data-field]:has(textarea)")), await box(payment)];
    expect(group.width).toBeCloseTo(body.width, 0);
    expect(notes.width).toBeCloseTo(body.width, 0);
  });
});

test.describe("compact density", () => {
  for (const path of [...LAYOUTS, ...ORGANISMS]) {
    test(`every interactive target on ${path} is at least 24 by 24 CSS pixels`, async ({ page }) => {
      await withoutMotion(page);
      await page.setViewportSize(WIDE);
      await page.addInitScript(() => {
        const set = () => (document.documentElement.dataset.density = "compact");
        if (document.documentElement) set();
        else
          new MutationObserver((_, observer) => {
            if (!document.documentElement) return;
            set();
            observer.disconnect();
          }).observe(document, { childList: true });
      });
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.dataset.density)).toBe("compact");
      const small = await page.evaluate(() => {
        const targets = [...document.querySelectorAll("main :is(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1']))")]
          // Links inside a sentence are exempt from 2.5.8 (the "inline" exception).
          .filter((el) => !(el.localName === "a" && getComputedStyle(el).display === "inline"))
          .filter((el) => el.getClientRects().length > 0)
          .map((el) => (el.matches("input[type='checkbox'], input[type='radio']") ? /** @type {Element} */ (el.closest("label")) : el));
        return targets
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width < 24 || box.height < 24)
          .map(({ el, box }) => `${el.localName}${el.id ? `#${el.id}` : ""} "${(el.textContent ?? "").trim().slice(0, 30)}": ${box.width}×${box.height}`);
      });
      expect(small).toEqual([]);
    });
  }
});
