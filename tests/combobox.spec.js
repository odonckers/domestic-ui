// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { schemes, withoutMotion, WCAG_TAGS, summarize } from "./helpers.js";

/*
 * <dui-combobox> (web-components/dui-combobox.js, css/components/molecules/combobox.css)
 * against the APG Combobox pattern, list autocomplete variant:
 * https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
 * Every example page with a combobox is also checked by a11y.spec.js (listbox open),
 * mobile.spec.js and motion-elevation.spec.js.
 */

const PAGE = "examples/molecules/combobox.html";
const CITIES = 13;

/** Wait for CSS transitions to finish, so geometry and colors are final. */
const settle = (/** @type {import("@playwright/test").Page} */ page) =>
  page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

test.describe("upgrade and ARIA", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto(PAGE);
  });

  test("builds a listbox from the datalist, removes list and keeps the same input", async ({ page }) => {
    const input = page.locator("#city");
    await expect(input).toHaveAttribute("role", "combobox");
    await expect(input).not.toHaveAttribute("list", /.*/);
    await expect(input).toHaveAttribute("name", "city");
    await expect(input).toHaveAttribute("aria-autocomplete", "list");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveAttribute("autocomplete", "off");
    const id = await input.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    const listbox = page.locator(`[id="${id}"]`);
    await expect(listbox).toHaveAttribute("role", "listbox");
    await expect(listbox.locator("[role='option']")).toHaveCount(CITIES);
    await expect(listbox).toBeHidden();
    await expect(page.getByRole("combobox", { name: "City" })).toHaveCount(1);
    // The datalist stays as the source of the options.
    await expect(page.locator("datalist#city-options option")).toHaveCount(CITIES);
    // The live region is in the DOM, empty, before anything is announced.
    await expect(page.locator("dui-combobox:has(#city) [role='status']")).toHaveText("");
  });

  test("Down and Up open and move aria-activedescendant, wrapping; the active option is aria-selected", async ({ page }) => {
    const input = page.locator("#city");
    const options = page.locator("#city-listbox [role='option']");
    await input.focus();
    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#city-listbox")).toBeVisible();
    // Named by the same label as the input.
    await expect(page.getByRole("listbox", { name: "City" })).toBeVisible();
    await expect(input).toHaveAttribute("aria-activedescendant", (await options.nth(0).getAttribute("id")) ?? "");
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(input).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveAttribute("aria-activedescendant", (await options.nth(1).getAttribute("id")) ?? "");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#city-listbox [aria-selected='true']")).toHaveCount(1);

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(input).toHaveAttribute("aria-activedescendant", (await options.nth(CITIES - 1).getAttribute("id")) ?? "");

    // Closed: Up opens on the last option.
    await page.keyboard.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).not.toHaveAttribute("aria-activedescendant", /.*/);
    await page.keyboard.press("ArrowUp");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(input).toHaveAttribute("aria-activedescendant", (await options.nth(CITIES - 1).getAttribute("id")) ?? "");
  });

  test("Home and End move the caret in the input and leave the list", async ({ page }) => {
    const input = page.locator("#city");
    await input.focus();
    await page.keyboard.type("er");
    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveAttribute("aria-activedescendant", /.+/);
    await page.keyboard.press("Home");
    await expect(input).not.toHaveAttribute("aria-activedescendant", /.*/);
    await expect(page.locator("#city-listbox [aria-selected='true']")).toHaveCount(0);
    expect(await input.evaluate((el) => /** @type {HTMLInputElement} */ (el).selectionStart)).toBe(0);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    await expect(input).not.toHaveAttribute("aria-activedescendant", /.*/);
    expect(await input.evaluate((el) => /** @type {HTMLInputElement} */ (el).selectionStart)).toBe(2);
    await expect(input).toHaveValue("er");
  });

  test("Alt+Down opens without an active option", async ({ page }) => {
    const input = page.locator("#city");
    await input.focus();
    await page.keyboard.press("Alt+ArrowDown");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(input).not.toHaveAttribute("aria-activedescendant", /.*/);
    await expect(page.locator("#city-listbox [aria-selected='true']")).toHaveCount(0);
    await expect(input).toHaveValue("");
  });

  test("typing filters case-insensitively by contains, and the status says how many match", async ({ page }) => {
    const input = page.locator("#city");
    const status = page.locator("dui-combobox:has(#city) [role='status']");
    await input.focus();
    await page.keyboard.type("BER");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#city-listbox [role='option']")).toHaveText(["Berlin", "Bern"]);
    await expect(status).toHaveText("2 results");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("russ");
    await expect(page.locator("#city-listbox [role='option']")).toHaveText(["Brussels"]);
    await expect(status).toHaveText("1 result");
    await page.keyboard.type("zz");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(status).toHaveText("No results");
    await input.fill("");
    await expect(status).toHaveText(`${CITIES} results`);
  });

  test("Enter accepts the active option, closes and fires change", async ({ page }) => {
    const input = page.locator("#city");
    await input.evaluate((el) => {
      window.changes = [];
      el.addEventListener("change", () => window.changes.push(/** @type {HTMLInputElement} */ (el).value));
    });
    await input.focus();
    await page.keyboard.type("lis");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("Lisbon");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toBeFocused();
    expect(await page.evaluate(() => window.changes)).toEqual(["Lisbon"]);
  });

  test("Escape closes the list, then clears the input", async ({ page }) => {
    const input = page.locator("#city");
    await input.focus();
    await page.keyboard.type("par");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveValue("par");
    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("");
    await expect(input).toHaveAttribute("aria-expanded", "false");
  });

  test("Tab closes the list without accepting and moves on", async ({ page }) => {
    const input = page.locator("#city");
    await input.focus();
    await page.keyboard.type("o");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");
    await expect(input).not.toBeFocused();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveValue("o");
  });

  test("clicking an option selects it, keeps focus in the input and fires change", async ({ page }) => {
    const input = page.locator("#city");
    let changed = false;
    await page.exposeFunction("onChanged", () => (changed = true));
    await input.evaluate((el) => el.addEventListener("change", () => window.onChanged()));
    await input.focus();
    await page.keyboard.type("v");
    await page.getByRole("option", { name: "Vienna" }).click();
    await expect(input).toHaveValue("Vienna");
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => changed).toBe(true);
  });

  test("option labels show as a hint and are matched too", async ({ page }) => {
    const input = page.locator("#carrier");
    await input.focus();
    await page.keyboard.type("next day");
    await expect(page.locator("#carrier-listbox [role='option']")).toHaveCount(2);
    await expect(page.locator("#carrier-listbox [role='option']").first()).toContainText("DHL Express");
  });
});

test("a form submits the accepted value", async ({ page }) => {
  await withoutMotion(page);
  await page.goto(PAGE);
  const input = page.locator("#carrier");
  await input.focus();
  await page.keyboard.type("ups");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("UPS Standard");
  // Enter with no active option submits the form natively.
  await page.keyboard.press("Enter");
  await expect(page.locator("#ship-result")).toHaveText("Submitted carrier: UPS Standard.");
});

test("the filter event fires with the query; the page replaces the options", async ({ page }) => {
  await withoutMotion(page);
  await page.goto(PAGE);
  await page.evaluate(() => {
    window.queries = [];
    document.getElementById("country-combobox")?.addEventListener("dui-combobox-filter", (e) => window.queries.push(/** @type {CustomEvent} */ (e).detail.query));
  });
  const input = page.locator("#country");
  await expect(page.locator("#country-listbox [role='option']")).toHaveCount(0);
  await input.focus();
  await page.keyboard.type("land");
  expect(await page.evaluate(() => window.queries)).toEqual(["l", "la", "lan", "land"]);
  await expect(page.locator("#country-listbox [role='option']")).toHaveText(["Finland", "Ireland", "Netherlands", "Poland"]);
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("dui-combobox:has(#country) [role='status']")).toHaveText("4 results");
  // The page's options also land in the datalist, the single source of options.
  await expect(page.locator("#country-options option")).toHaveCount(4);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("Finland");

  // Changing the datalist directly is picked up too.
  await page.evaluate(() => {
    const option = document.createElement("option");
    option.value = "Iceland";
    document.getElementById("country-options")?.replaceChildren(option);
  });
  await input.focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(page.locator("#country-listbox [role='option']")).toHaveText(["Iceland"]);
});

test("without JavaScript the input keeps its native datalist and passes axe", async ({ page }) => {
  await page.route("**/dui-combobox.js", (route) => route.abort());
  await page.goto(PAGE);
  const input = page.locator("#city");
  await expect(input).toHaveAttribute("list", "city-options");
  await expect(input).not.toHaveAttribute("role", /.*/);
  expect(await input.evaluate((el) => /** @type {HTMLInputElement} */ (el).list?.options.length)).toBe(CITIES);
  await input.fill("Oslo");
  await expect(input).toHaveValue("Oslo");
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(violations, summarize(violations)).toEqual([]);
});

for (const colorScheme of schemes) {
  test(`axe passes with the listbox open and an option active (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(PAGE);
    await page.locator("#city").focus();
    await page.keyboard.press("ArrowDown");
    await settle(page);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(violations, summarize(violations)).toEqual([]);
  });
}

test("the active option has a 3:1 outline, not color alone, and options are at least 24px tall", async ({ page }) => {
  await withoutMotion(page);
  await page.goto(PAGE);
  await page.locator("#city").focus();
  await page.keyboard.press("ArrowDown");
  const active = page.locator("#city-listbox [aria-selected='true']");
  const style = await active.evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: Number.parseFloat(s.outlineWidth), outlineStyle: s.outlineStyle };
  });
  expect(style.outlineStyle).toBe("solid");
  expect(style.width).toBeGreaterThanOrEqual(2);
  for (const option of await page.locator("#city-listbox [role='option']").all()) {
    const box = await option.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
  }
});

test.describe("at 320px", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("the open listbox stays inside the viewport", async ({ page }) => {
    await withoutMotion(page);
    await page.goto(PAGE);
    for (const id of ["city", "carrier"]) {
      await page.locator(`#${id}`).focus();
      await page.keyboard.press("Alt+ArrowDown");
      const listbox = page.locator(`#${id}-listbox`);
      await expect(listbox).toBeVisible();
      const box = await listbox.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      await page.keyboard.press("Escape");
    }
  });
});

test('data-motion="none" gives the listbox 0s durations; reduced motion drops the zoom only', async ({ page }) => {
  await page.goto(PAGE);
  const durations = () =>
    page.locator("#city-listbox").evaluate((el) => {
      const s = getComputedStyle(el);
      const props = s.transitionProperty.split(",").map((p) => p.trim());
      const times = s.transitionDuration.split(",").map((d) => Number.parseFloat(d));
      return Object.fromEntries(props.map((p, i) => [p, times[i % times.length]]));
    });
  const normal = await durations();
  expect(normal.opacity).toBeGreaterThan(0);
  expect(normal.scale).toBeGreaterThan(0);

  await page.evaluate(() => document.documentElement.setAttribute("data-motion", "reduced"));
  const reduced = await durations();
  expect(reduced.opacity).toBeGreaterThan(0);
  expect(reduced.scale).toBe(0);

  await page.evaluate(() => document.documentElement.setAttribute("data-motion", "none"));
  await page.locator("#city").focus();
  await page.keyboard.press("Alt+ArrowDown");
  const none = await durations();
  expect(Object.values(none).every((d) => d === 0)).toBe(true);
});
