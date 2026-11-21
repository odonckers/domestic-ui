// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { examples, schemes, withoutMotion, WCAG_TAGS, summarize } from "./helpers.js";

/*
 * Data table organism (css/components/organisms/data-table.css) and <dui-table>
 * (web-components/dui-table.js), on examples/organisms/data-table.html.
 * - Sorting follows the APG Sortable Table example: header buttons, aria-sort on the
 *   sorted <th> only, ascending and descending in turn:
 *   https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/
 * - Without JavaScript there are no sort buttons and the page passes axe.
 * - Selection: count in a status message (WCAG 4.1.3), select all and its mixed state,
 *   a unique name per checkbox, a highlight that is not color alone (WCAG 1.4.1).
 * - The sticky header stays at the top of its scroll container.
 * - Loading: aria-busy, and the shimmer stops with data-motion="none".
 * - 320px: the page never scrolls sideways; the table container does and is focusable.
 * axe in light and dark, html-validate and the 320/375 checks also pick the page up on their own.
 */

const PAGE = "examples/organisms/data-table.html";
const MODULE = "**/web-components/dui-table.js";

test("the data table example is picked up by every per-page check", () => {
  expect(examples).toContain(PAGE);
});

/** Text of one column of a table's body rows. @param {import("@playwright/test").Locator} table @param {number} index */
const column = (table, index) => table.locator("tbody tr").evaluateAll((rows, i) => rows.map((row) => (/** @type {HTMLTableRowElement} */ (row).cells[i]?.textContent ?? "").trim()), index);

test.describe("sorting", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto(PAGE);
  });

  test("the upgrade turns sortable headers into buttons and adds the caption hint", async ({ page }) => {
    const table = page.locator("#sort-table");
    await expect(table.locator("thead th > button")).toHaveCount(5);
    await expect(table.getByRole("columnheader", { name: "Customer" }).getByRole("button", { name: "Customer", exact: true })).toBeVisible();
    // The arrow is hidden from assistive technology; aria-sort carries the state.
    await expect(table.locator("thead th > button > [aria-hidden='true']")).toHaveCount(5);
    await expect(table.locator("caption")).toHaveText("Recent orders, column headers with buttons are sortable.");
    await expect(table.locator("thead [aria-sort]")).toHaveCount(0);
  });

  test("a click sorts ascending, a second click descending; aria-sort is on that header only", async ({ page }) => {
    const table = page.locator("#sort-table");
    const customer = table.locator("thead th").nth(1);
    await customer.getByRole("button").click();
    await expect(customer).toHaveAttribute("aria-sort", "ascending");
    await expect(table.locator("thead [aria-sort]")).toHaveCount(1);
    const ascending = await column(table, 1);
    expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
    expect(ascending[0]).toBe("Analytical Engines Ltd.");

    await customer.getByRole("button").click();
    await expect(customer).toHaveAttribute("aria-sort", "descending");
    expect(await column(table, 1)).toEqual([...ascending].reverse());

    // Another column starts ascending and takes aria-sort away from the first.
    const order = table.locator("thead th").nth(0);
    await order.getByRole("button").click();
    await expect(order).toHaveAttribute("aria-sort", "ascending");
    await expect(customer).not.toHaveAttribute("aria-sort", /.*/);
    expect(await column(table, 0)).toEqual(["1035", "1036", "1037", "1038", "1039", "1040", "1041", "1042"]);
  });

  test("Enter and Space on a header button sort too", async ({ page }) => {
    const table = page.locator("#sort-table");
    const status = table.locator("thead th").nth(3);
    await status.getByRole("button").focus();
    await page.keyboard.press("Enter");
    await expect(status).toHaveAttribute("aria-sort", "ascending");
    expect((await column(table, 3))[0]).toBe("Cancelled");
    await page.keyboard.press("Space");
    await expect(status).toHaveAttribute("aria-sort", "descending");
    expect((await column(table, 3))[0]).toBe("Shipped");
    await expect(status.getByRole("button")).toBeFocused();
  });

  test("numbers sort by value, not as text", async ({ page }) => {
    const table = page.locator("#sort-table");
    await table.locator("thead th").nth(4).getByRole("button").click();
    expect(await column(table, 4)).toEqual(["€48.50", "€72.00", "€310.25", "€615.90", "€905.10", "€1,240.00", "€3,980.00", "€12,450.00"]);
    await table.locator("thead th").nth(4).getByRole("button").click();
    expect((await column(table, 4))[0]).toBe("€12,450.00");
  });

  test("dates sort by their datetime, not their text", async ({ page }) => {
    const table = page.locator("#sort-table");
    await table.locator("thead th").nth(2).getByRole("button").click();
    const placed = await table.locator("tbody tr td:nth-of-type(2) time").evaluateAll((times) => times.map((t) => t.getAttribute("datetime")));
    expect(placed).toEqual([...placed].sort());
    expect(placed[0]).toBe("2025-02-24");
  });

  test("the sort is stable: equal values keep their order", async ({ page }) => {
    const table = page.locator("#sort-table");
    await table.locator("thead th").nth(3).getByRole("button").click();
    const rows = await table.locator("tbody tr").evaluateAll((all) => all.map((r) => [/** @type {HTMLTableRowElement} */ (r).cells[3].textContent?.trim(), /** @type {HTMLTableRowElement} */ (r).cells[0].textContent?.trim()]));
    // Original order: 1042 Shipped … 1036 Shipped; 1041 Delivered … 1038 Delivered.
    expect(rows.filter(([s]) => s === "Shipped").map(([, n]) => n)).toEqual(["1042", "1036"]);
    expect(rows.filter(([s]) => s === "Delivered").map(([, n]) => n)).toEqual(["1041", "1038"]);
  });

  test("dui-table-sort fires with the column and direction; canceling it leaves the rows alone", async ({ page }) => {
    const table = page.locator("#sort-table");
    const before = await column(table, 0);
    const detail = await page.evaluate(() => {
      const element = /** @type {HTMLElement} */ (document.querySelector("#sort-table")?.closest("dui-table"));
      return new Promise((resolve) => {
        element.addEventListener(
          "dui-table-sort",
          (event) => {
            const e = /** @type {CustomEvent} */ (event);
            e.preventDefault();
            resolve({ column: e.detail.column.textContent.trim(), index: e.detail.index, direction: e.detail.direction, cancelable: e.cancelable, bubbles: e.bubbles });
          },
          { once: true },
        );
        /** @type {HTMLButtonElement} */ (element.querySelector("thead th:nth-child(5) button")).click();
      });
    });
    expect(detail).toEqual({ column: "Total", index: 4, direction: "ascending", cancelable: true, bubbles: true });
    expect(await column(table, 0)).toEqual(before);
    await expect(table.locator("thead [aria-sort]")).toHaveCount(0);
  });
});

/**
 * Visible buttons that would do nothing without JavaScript: type="button" with no popovertarget or commandfor.
 * @param {import("@playwright/test").Page} page
 */
const deadButtons = (page) =>
  page.locator("button[type='button']:not([popovertarget], [commandfor])").evaluateAll((all) =>
    all.filter((b) => b.checkVisibility()).map((b) => (b.textContent ?? "").trim().replace(/\s+/g, " ")),
  );

/**
 * The bulk-action buttons: submit buttons of a form that holds every row checkbox.
 * @param {import("@playwright/test").Page} page
 * @param {string} toolbar
 * @param {string} table
 */
const bulkActionsSubmit = (page, toolbar, table) =>
  page.evaluate(
    ([toolbarSelector, tableSelector]) => {
      const buttons = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll(`${toolbarSelector} button`)]);
      const boxes = /** @type {HTMLInputElement[]} */ ([...document.querySelectorAll(`${tableSelector} tbody input[type='checkbox']`)]);
      return {
        buttons: buttons.length,
        boxes: boxes.length,
        submit: buttons.every((b) => b.type === "submit" && b.form !== null && b.name === "action" && Boolean(b.value)),
        sameForm: buttons.every((b) => boxes.every((box) => box.form === b.form && box.name !== "")),
        method: buttons[0]?.form?.method ?? "",
      };
    },
    [toolbar, table],
  );

test.describe("without JavaScript", () => {
  test("headers stay plain text, nothing is a dead control, and the page passes axe", async ({ page }) => {
    await page.route(MODULE, (route) => route.abort());
    await page.goto(PAGE);
    await expect(page.locator("table[data-table] thead button")).toHaveCount(0);
    await expect(page.locator("#sort-table caption")).toHaveText("Recent orders");
    await expect(page.locator("#sort-table thead th").nth(1)).toHaveText("Customer");
    // No "select all" checkbox: it would do nothing.
    await expect(page.locator("#select-table thead input")).toHaveCount(0);
    // Row checkboxes still work as form controls.
    await page.getByRole("checkbox", { name: "Select order 1040" }).check();
    await expect(page.getByRole("checkbox", { name: "Select order 1040" })).toBeChecked();
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(violations, summarize(violations)).toEqual([]);
  });
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("no visible button needs the script: bulk actions submit a POST form with the row checkboxes", async ({ page }) => {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(viewport);
      await page.goto(PAGE);
      expect(await deadButtons(page), `${viewport.width}px`).toEqual([]);
    }
    await expect(page.locator("#loading-toggle")).toBeHidden();
    expect(await bulkActionsSubmit(page, "#bulk-orders [role='toolbar']", "#select-table")).toEqual({ buttons: 3, boxes: 6, submit: true, sameForm: true, method: "post" });
  });
});

test.describe("selection", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto(PAGE);
  });

  test("checking rows updates the count, the select-all state, the toolbar and the highlight", async ({ page }) => {
    const table = page.locator("#select-table");
    const count = page.locator("#selection-count");
    const all = page.getByRole("checkbox", { name: "Select all open orders" });
    const toolbar = page.getByRole("toolbar", { name: "Bulk actions" });
    await expect(count).toHaveRole("status");
    await expect(count).toHaveText("0 of 6 selected");
    await expect(all).not.toBeChecked();
    for (const button of await toolbar.getByRole("button").all()) await expect(button).toBeDisabled();

    const row = table.locator("tbody tr").nth(1);
    const before = await row.locator("td").nth(1).evaluate((td) => getComputedStyle(td).backgroundColor);
    const edgeBefore = await row.locator("td").first().evaluate((td) => getComputedStyle(td).borderInlineStartColor);
    await page.getByRole("checkbox", { name: "Select order 1041" }).check();
    await expect(count).toHaveText("1 of 6 selected");
    expect(await all.evaluate((box) => /** @type {HTMLInputElement} */ (box).indeterminate)).toBe(true);
    for (const button of await toolbar.getByRole("button").all()) await expect(button).toBeEnabled();
    // Highlight: a tinted background and, not by color alone, a bar on the leading edge.
    expect(await row.locator("td").nth(1).evaluate((td) => getComputedStyle(td).backgroundColor)).not.toBe(before);
    const edge = await row.locator("td").first().evaluate((td) => ({ color: getComputedStyle(td).borderInlineStartColor, width: Number.parseFloat(getComputedStyle(td).borderInlineStartWidth) }));
    expect(edge.color).not.toBe(edgeBefore);
    expect(edge.width).toBeGreaterThanOrEqual(3);

    await page.getByRole("checkbox", { name: "Select order 1038" }).check();
    await expect(count).toHaveText("2 of 6 selected");
    await page.getByRole("checkbox", { name: "Select order 1041" }).uncheck();
    await expect(count).toHaveText("1 of 6 selected");
  });

  test("select all checks every row, then unchecks every row; mixed when some are checked", async ({ page }) => {
    const all = page.getByRole("checkbox", { name: "Select all open orders" });
    const rows = page.locator("#select-table tbody input[type='checkbox']");
    await all.check();
    await expect(page.locator("#selection-count")).toHaveText("6 of 6 selected");
    for (const box of await rows.all()) await expect(box).toBeChecked();
    expect(await all.evaluate((box) => /** @type {HTMLInputElement} */ (box).indeterminate)).toBe(false);

    await rows.nth(0).uncheck();
    await expect(page.locator("#selection-count")).toHaveText("5 of 6 selected");
    expect(await all.evaluate((box) => /** @type {HTMLInputElement} */ (box).indeterminate)).toBe(true);
    await expect(all).not.toBeChecked();
    // A click on the mixed checkbox selects every row (it becomes checked).
    await all.click();
    await expect(page.locator("#selection-count")).toHaveText("6 of 6 selected");

    await all.uncheck();
    await expect(page.locator("#selection-count")).toHaveText("0 of 6 selected");
    for (const box of await rows.all()) await expect(box).not.toBeChecked();
    for (const button of await page.getByRole("toolbar", { name: "Bulk actions" }).getByRole("button").all()) await expect(button).toBeDisabled();
  });

  test("Space on a focused checkbox selects its row", async ({ page }) => {
    await page.getByRole("checkbox", { name: "Select order 1039" }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator("#selection-count")).toHaveText("1 of 6 selected");
  });

  test("every checkbox has a unique accessible name", async ({ page }) => {
    const names = [];
    for (const box of await page.locator("#select-table input[type='checkbox']").all()) {
      const name = await box.evaluate((el) => /** @type {HTMLInputElement} */ (el).labels?.[0]?.textContent?.trim() ?? "");
      await expect(page.getByRole("checkbox", { name, exact: true })).toHaveCount(1);
      names.push(name);
    }
    expect(names).toHaveLength(7);
    expect(new Set(names).size).toBe(7);
    expect(names).toContain("Select order 1042");
  });

  test("the enabled toolbar keeps one Tab stop, and its actions use the selection", async ({ page }) => {
    await page.getByRole("checkbox", { name: "Select order 1040" }).check();
    const buttons = page.getByRole("toolbar", { name: "Bulk actions" }).getByRole("button");
    expect(await buttons.evaluateAll((all) => all.map((b) => /** @type {HTMLElement} */ (b).tabIndex))).toEqual([0, -1, -1]);
    await buttons.first().click();
    await expect(page.locator("#bulk-result")).toHaveText("1 order marked as shipped.");
    await expect(page.locator("#select-table tbody tr").nth(2).locator("[data-badge]")).toHaveText("Shipped");
  });
});

test.describe("sticky header", () => {
  test("the header stays at the top of its scroll container", async ({ page }) => {
    await withoutMotion(page);
    // A short viewport: the container is at most --dui-size-pane (100svh) tall, so it scrolls.
    await page.setViewportSize({ width: 1024, height: 480 });
    await page.goto(PAGE);
    const scroller = page.locator("#wide-scroll");
    await scroller.scrollIntoViewIfNeeded();
    const metrics = await scroller.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
    expect(metrics.scroll).toBeGreaterThan(metrics.client);
    await scroller.evaluate((el) => {
      el.scrollTop = 300;
    });
    const { containerTop, headerTop, scrollTop, rowHidden } = await scroller.evaluate((el) => {
      const th = /** @type {HTMLElement} */ (el.querySelector("thead th"));
      const firstRow = /** @type {HTMLElement} */ (el.querySelector("tbody tr"));
      return {
        containerTop: el.getBoundingClientRect().top + el.clientTop,
        headerTop: th.getBoundingClientRect().top,
        scrollTop: el.scrollTop,
        rowHidden: firstRow.getBoundingClientRect().bottom < th.getBoundingClientRect().top,
      };
    });
    expect(scrollTop).toBeGreaterThan(0);
    expect(Math.abs(headerTop - containerTop)).toBeLessThan(1.5);
    expect(rowHidden).toBe(true);
    // The header keeps an opaque surface.
    const background = await scroller.locator("thead th").first().evaluate((th) => getComputedStyle(th).backgroundColor);
    expect(background).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  });
});

test.describe("loading", () => {
  test("aria-busy toggles with skeleton rows hidden from assistive technology", async ({ page }) => {
    await withoutMotion(page);
    await page.goto(PAGE);
    const table = page.locator("#loading-table");
    const toggle = page.getByRole("button", { name: "Show loading state" });
    await expect(table).not.toHaveAttribute("aria-busy", /.*/);
    await toggle.click();
    await expect(table).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#loading-status")).toHaveText("Loading invoices…");
    await expect(table.locator("tbody tr[aria-hidden='true']")).toHaveCount(3);
    // AT hears the caption and headers, no blank rows.
    await expect(table.getByRole("row")).toHaveCount(1);
    const bar = await table.locator("tbody td").first().evaluate((td) => {
      const style = getComputedStyle(td, "::before");
      return { content: style.content, height: Number.parseFloat(style.blockSize) };
    });
    expect(bar.content).toBe('""');
    expect(bar.height).toBeGreaterThan(0);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(violations, summarize(violations)).toEqual([]);

    await toggle.click();
    await expect(table).not.toHaveAttribute("aria-busy", /.*/);
    await expect(table.locator("tbody tr")).toHaveCount(4);
    await expect(page.locator("#loading-status")).toHaveText("4 invoices loaded.");
  });

  /** @param {import("@playwright/test").Page} page */
  const shimmer = async (page) => {
    await page.getByRole("button", { name: "Show loading state" }).click();
    return page.locator("#loading-table tbody td").first().evaluate((td) => {
      const style = getComputedStyle(td, "::before");
      return { name: style.animationName, duration: style.animationDuration };
    });
  };

  test("the skeleton shimmers by default", async ({ page }) => {
    await page.goto(PAGE);
    const { name, duration } = await shimmer(page);
    expect(name).toBe("dui-table-shimmer");
    expect(Number.parseFloat(duration)).toBeGreaterThan(0);
  });

  test("the shimmer stops with data-motion=\"none\" and with reduced motion", async ({ page }) => {
    await withoutMotion(page);
    await page.goto(PAGE);
    expect(Number.parseFloat((await shimmer(page)).duration)).toBe(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => document.documentElement.removeAttribute("data-motion"));
    const duration = await page.locator("#loading-table tbody td").first().evaluate((td) => getComputedStyle(td, "::before").animationDuration);
    expect(Number.parseFloat(duration)).toBe(0);
  });
});

test.describe("small screens", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("the page does not scroll sideways; the wide table's container does and takes focus", async ({ page }) => {
    await page.goto(PAGE);
    const page320 = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(page320.scroll).toBeLessThanOrEqual(page320.client);
    const scroller = page.locator("#wide-scroll");
    const box = await scroller.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(box.scroll).toBeGreaterThan(box.client);
    await expect(scroller).toHaveAttribute("tabindex", "0");
    await expect(scroller).toHaveRole("region");
    await expect(scroller).toHaveAccessibleName("Order lines, February");
    await scroller.focus();
    await expect(scroller).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });
});

test.describe("compact density", () => {
  /** @param {import("@playwright/test").Page} page */
  const compact = (page) =>
    page.addInitScript(() => {
      const set = () => (document.documentElement.dataset.density = "compact");
      if (document.documentElement) set();
      else
        new MutationObserver((_, observer) => {
          if (!document.documentElement) return;
          set();
          observer.disconnect();
        }).observe(document, { childList: true });
    });

  for (const colorScheme of schemes) {
    test(`passes axe in compact density (${colorScheme})`, async ({ page }) => {
      await withoutMotion(page);
      await compact(page);
      await page.emulateMedia({ colorScheme });
      await page.goto(PAGE);
      await page.getByRole("checkbox", { name: "Select order 1041" }).check();
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(violations, summarize(violations)).toEqual([]);
    });
  }

  test("sort buttons and checkbox labels stay at least 24 by 24 CSS pixels", async ({ page }) => {
    await withoutMotion(page);
    await compact(page);
    await page.goto(PAGE);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("table[data-table] :is(th > button, td > label, th > label, td > label)")]
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width < 24 || box.height < 24)
        .map(({ el, box }) => `${el.localName} "${(el.textContent ?? "").trim()}": ${box.width}×${box.height}`),
    );
    expect(small).toEqual([]);
    const label = await page.getByRole("checkbox", { name: "Select order 1042" }).evaluate((box) => /** @type {HTMLElement} */ (box.closest("label")).getBoundingClientRect().height);
    expect(label).toBe(32);
  });
});
