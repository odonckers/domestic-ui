// @ts-check
import { test, expect } from "@playwright/test";
import { examples, withoutMotion } from "./helpers.js";

/*
 * Page layouts in css/layout/: list-detail, split, dashboard, the sticky action bar,
 * and the settings page composed from them.
 * - Side by side when the wrapper is wide, stacked when it is narrow (container queries).
 * - list-detail: aria-current on the selected link; Tab goes through the list, then the detail.
 * - Action bar: sticky while the form scrolls, and never covers the focused field
 *   (WCAG 2.4.11 Focus Not Obscured: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
 * axe, html-validate and the 320/375 overflow checks pick these pages up on their own.
 */

const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 360, height: 800 };

const PAGES = ["list-detail", "split", "dashboard", "action-bar", "settings"].map((n) => `examples/layouts/${n}.html`);

test("the layout examples are picked up by every per-page check", () => {
  for (const path of [...PAGES, "examples/layouts/index.html"]) expect(examples).toContain(path);
});

/** @param {import("@playwright/test").Locator} locator */
const box = async (locator) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error("not rendered");
  return b;
};

/**
 * Two boxes side by side (second to the inline end of the first, tops aligned)
 * or stacked (second below the first, same start edge).
 * @param {import("@playwright/test").Locator} first
 * @param {import("@playwright/test").Locator} second
 */
const arrangement = async (first, second) => {
  const [a, b] = [await box(first), await box(second)];
  if (b.x >= a.x + a.width - 1 && Math.abs(b.y - a.y) < 2) return "side by side";
  if (b.y >= a.y + a.height - 1 && Math.abs(b.x - a.x) < 2) return "stacked";
  return `neither: ${JSON.stringify({ a, b })}`;
};

/** @type {{ name: string, path: string, first: string, second: string }[]} */
const CASES = [
  { name: "list-detail", path: PAGES[0], first: "[data-list-detail] > nav[aria-label='Orders']", second: "[data-list-detail] > section[aria-labelledby='order-1042-title']" },
  { name: "split 2:1", path: PAGES[1], first: "[data-split='2:1'] > :first-child", second: "[data-split='2:1'] > :last-child" },
  { name: "split 1:1", path: PAGES[1], first: "[data-split=''] > :first-child", second: "[data-split=''] > :last-child" },
  { name: "split 1:2", path: PAGES[1], first: "[data-split='1:2'] > :first-child", second: "[data-split='1:2'] > :last-child" },
  { name: "dashboard", path: PAGES[2], first: "[data-dashboard=''] > :nth-child(1)", second: "[data-dashboard=''] > :nth-child(2)" },
  { name: "settings", path: PAGES[4], first: "[data-list-detail] > nav", second: "[data-list-detail] > section" },
];

for (const c of CASES) {
  test.describe(c.name, () => {
    test("is side by side when the wrapper is wide", async ({ page }) => {
      await page.setViewportSize(WIDE);
      await page.goto(c.path);
      expect(await arrangement(page.locator(c.first), page.locator(c.second))).toBe("side by side");
    });

    test("is stacked when the wrapper is narrow", async ({ page }) => {
      await page.setViewportSize(NARROW);
      await page.goto(c.path);
      expect(await arrangement(page.locator(c.first), page.locator(c.second))).toBe("stacked");
    });
  });
}

test("the layout follows its wrapper, not the viewport", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.goto(PAGES[0]);
  const wrapper = page.locator("[data-list-detail]").first();
  await wrapper.evaluate((el) => {
    /** @type {HTMLElement} */ (el).style.inlineSize = "30rem";
  });
  expect(await arrangement(page.locator(CASES[0].first), page.locator(CASES[0].second))).toBe("stacked");
});

test("split ratios: 2:1 and 1:2 give two thirds to one region, 1:1 halves", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.goto(PAGES[1]);
  const ratio = async (/** @type {string} */ value) => {
    const [a, b] = [await box(page.locator(`[data-split='${value}'] > :first-child`)), await box(page.locator(`[data-split='${value}'] > :last-child`))];
    return a.width / b.width;
  };
  expect(await ratio("2:1")).toBeGreaterThan(1.8);
  expect(await ratio("2:1")).toBeLessThan(2.4);
  expect(await ratio("1:2")).toBeGreaterThan(1 / 2.4);
  expect(await ratio("1:2")).toBeLessThan(1 / 1.8);
  expect(await ratio("")).toBeCloseTo(1, 1);
});

test.describe("dashboard tiles", () => {
  test("a wide tile spans two columns when they fit, one when they do not; a full tile spans the row", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(PAGES[2]);
    const one = await box(page.locator("[data-dashboard=''] > :nth-child(1)"));
    const wide = await box(page.locator("[data-dashboard='wide']"));
    const full = await box(page.locator("[data-dashboard='full']"));
    const grid = await box(page.locator("[data-dashboard]:not([data-dashboard~='wide'], [data-dashboard~='full'])"));
    expect(wide.width).toBeGreaterThan(one.width * 2);
    expect(full.width).toBeCloseTo(grid.width, 0);

    await page.setViewportSize(NARROW);
    const narrowOne = await box(page.locator("[data-dashboard=''] > :nth-child(1)"));
    const narrowWide = await box(page.locator("[data-dashboard='wide']"));
    expect(narrowWide.width).toBeCloseTo(narrowOne.width, 0);
  });
});

test.describe("list-detail", () => {
  test("the selected link has aria-current and looks different from the rest", async ({ page }) => {
    await page.goto(PAGES[0]);
    const list = page.getByRole("navigation", { name: "Orders" });
    const current = list.locator("a[aria-current='page']");
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(/Order 1042/);
    const [selected, other] = await Promise.all([current, list.locator("a:not([aria-current])").first()].map((l) =>
      l.evaluate((a) => {
        const s = getComputedStyle(a);
        return { weight: s.fontWeight, bar: s.borderInlineStartColor, background: s.backgroundColor };
      }),
    ));
    expect(selected.weight).not.toBe(other.weight);
    expect(selected.bar).not.toBe(other.bar);
    expect(selected.background).not.toBe(other.background);
  });

  // WCAG 1.4.1 Use of Color and 1.4.11 Non-text Contrast: a bar on the leading edge and bold text, not a tint alone,
  // and the bar is still drawn (in Highlight) in forced colors mode, where backgrounds are dropped.
  for (const forcedColors of /** @type {const} */ (["none", "active"])) {
    test(`the selected item has a leading bar the others lack (forced colors: ${forcedColors})`, async ({ page }) => {
      await page.emulateMedia({ forcedColors });
      await page.goto(PAGES[0]);
      const list = page.getByRole("navigation", { name: "Orders" });
      const read = (/** @type {import("@playwright/test").Locator} */ l) =>
        l.evaluate((a) => {
          const s = getComputedStyle(a);
          return { width: parseFloat(s.borderInlineStartWidth), style: s.borderInlineStartStyle, color: s.borderInlineStartColor, weight: s.fontWeight };
        });
      const selected = await read(list.locator("a[aria-current='page']"));
      const other = await read(list.locator("a:not([aria-current])").first());
      expect(selected.width).toBeGreaterThanOrEqual(3);
      expect(selected.style).toBe("solid");
      expect(selected.color).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
      expect(selected.color).not.toBe(other.color);
      expect(selected.weight).not.toBe(other.weight);
    });
  }

  test("aria-current on the list item marks its link too", async ({ page }) => {
    await page.goto(PAGES[0]);
    const list = page.getByRole("navigation", { name: "Orders" });
    const second = list.locator("li").nth(1);
    const before = await second.locator("a").evaluate((a) => getComputedStyle(a).borderInlineStartColor);
    await second.evaluate((li) => {
      li.closest("ul")?.querySelector("[aria-current]")?.removeAttribute("aria-current");
      li.setAttribute("aria-current", "true");
    });
    const after = await second.locator("a").evaluate((a) => getComputedStyle(a).borderInlineStartColor);
    expect(after).not.toBe(before);
  });

  test("Tab moves through every list link, then into the detail", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(PAGES[0]);
    const links = page.getByRole("navigation", { name: "Orders" }).getByRole("link");
    await links.first().focus();
    const count = await links.count();
    for (let i = 1; i < count; i++) {
      await page.keyboard.press("Tab");
      await expect(links.nth(i)).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(page.locator("section[aria-labelledby='order-1042-title']")).toBeFocused();
  });

  test("the detail is a pane that scrolls on its own when wide, and part of the page when narrow", async ({ page }) => {
    const detail = page.locator("section[aria-labelledby='order-1042-title']");
    const style = () => detail.evaluate((el) => ({ position: getComputedStyle(el).position, overflow: getComputedStyle(el).overflowY, max: getComputedStyle(el).maxBlockSize }));
    await page.setViewportSize(WIDE);
    await page.goto(PAGES[0]);
    expect(await style()).toEqual({ position: "sticky", overflow: "auto", max: `${WIDE.height}px` });
    await page.setViewportSize(NARROW);
    expect(await style()).toMatchObject({ position: "static", overflow: "visible", max: "none" });
  });
});

test.describe("action bar", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
  });

  for (const viewport of [{ width: 1280, height: 720 }, { width: 320, height: 640 }]) {
    test(`stays in view while the form scrolls (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(PAGES[3]);
      const bar = page.locator("[data-action-bar]");
      const form = page.locator("form:has(> [data-action-bar])");
      await form.locator("input").first().scrollIntoViewIfNeeded();
      const formBox = await box(form);
      expect(formBox.y + formBox.height, "the form is taller than the window").toBeGreaterThan(viewport.height);
      for (const y of [0, 200, 400]) {
        await page.evaluate((top) => window.scrollTo(0, top), (await page.evaluate(() => window.scrollY)) + y);
        const b = await box(bar);
        const formNow = await box(form);
        if (formNow.y + formNow.height <= viewport.height) break; // the end of the form is in view: the bar rests there
        expect(b.y + b.height, `bar bottom at scroll +${y}`).toBeLessThanOrEqual(viewport.height + 0.5);
        expect(b.y + b.height, `bar bottom at scroll +${y}`).toBeGreaterThan(viewport.height - 2);
      }
    });

    test(`Tab never leaves the focused field under the bar (${viewport.width}px)`, async ({ page, browserName }) => {
      await page.setViewportSize(viewport);
      await page.goto(PAGES[3]);
      const bar = page.locator("[data-action-bar]");
      const fields = page.locator("form:has(> [data-action-bar]) :is(input, select, textarea)");
      // Start as a keyboard user would: the first field is reached with the page scrolled to it.
      await fields.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
      await fields.first().focus();
      const count = await fields.count();
      for (let i = 0; i < count; i++) {
        await expect(fields.nth(i)).toBeFocused();
        const f = await box(fields.nth(i));
        const b = await box(bar);
        // WebKit reveals the caret of a focused <textarea>, not the whole box, and ignores
        // scroll-padding for it: the caret line stays above the bar, so 2.4.11 (not entirely
        // hidden) holds, but the lower lines can sit under the bar.
        const caretOnly = browserName === "webkit" && (await fields.nth(i).evaluate((el) => el.localName === "textarea"));
        if (caretOnly) expect(f.y + 24, `field ${i} first line vs bar top`).toBeLessThanOrEqual(b.y + 0.5);
        else expect(f.y + f.height, `field ${i} bottom vs bar top`).toBeLessThanOrEqual(b.y + 0.5);
        expect(f.y, `field ${i} is in the window`).toBeGreaterThanOrEqual(0);
        await page.keyboard.press("Tab");
      }
      await expect(bar.getByRole("button").first()).toBeFocused();
    });
  }

  test("Tab never leaves the focused field under the bar inside a pane that scrolls on its own (settings)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto(PAGES[4]);
    const pane = page.locator("[data-list-detail] > section");
    const bar = pane.locator("[data-action-bar]");
    const fields = pane.locator("form :is(input:not([type='checkbox']), select, textarea)");
    await fields.first().focus();
    const count = await fields.count();
    for (let i = 0; i < count; i++) {
      await expect(fields.nth(i)).toBeFocused();
      const f = await box(fields.nth(i));
      const b = await box(bar);
      expect(f.y + f.height, `field ${i} bottom vs bar top`).toBeLessThanOrEqual(b.y + 0.5);
      // Next text-like field: Tab past any checkbox in between.
      await page.keyboard.press("Tab");
    }
  });
});

/*
 * The plain document page (css/layout/page.css): landmarks that are children
 * of <body> share one centered column; a main holding one card is a narrow,
 * centered page. html-validate, axe and the 320px overflow checks cover both
 * pages already.
 */
test.describe("plain document page", () => {
  const CONTENT = "examples/pages/content-page.html";
  const SIGN_IN = "examples/pages/sign-in.html";

  test("header, main and footer share one centered column with a gutter", async ({ page }) => {
    for (const viewport of [WIDE, NARROW]) {
      await page.setViewportSize(viewport);
      await page.goto(CONTENT);
      const [header, main, footer] = await Promise.all(["body > header", "body > main", "body > footer"].map((s) => box(page.locator(s))));
      // Centered: the same space on both sides.
      expect(Math.abs(main.x - (viewport.width - main.x - main.width))).toBeLessThan(1);
      // The text never touches the window edge; the header and footer hairlines span the text column, not the gutters.
      const h1 = await box(page.locator("h1"));
      expect(h1.x).toBeGreaterThanOrEqual(16);
      const gutter = h1.x - main.x;
      for (const edge of [header, footer]) {
        expect(Math.abs(edge.x - h1.x)).toBeLessThan(1);
        expect(Math.abs(edge.width - (main.width - 2 * gutter))).toBeLessThan(1);
      }
    }
  });

  test("the brand and the site navigation share a row when wide", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(CONTENT);
    const brand = await box(page.locator("body > header > a"));
    const nav = await box(page.locator("body > header > nav"));
    expect(nav.x).toBeGreaterThan(brand.x + brand.width);
    expect(Math.abs(brand.y + brand.height / 2 - (nav.y + nav.height / 2))).toBeLessThan(4);
  });

  test("a main with one card is narrow and centered on both axes", async ({ page }) => {
    for (const viewport of [WIDE, NARROW]) {
      await page.setViewportSize(viewport);
      await page.goto(SIGN_IN);
      const card = await box(page.locator("main > [data-card]"));
      expect(card.width).toBeLessThanOrEqual(24 * 16 + 1);
      expect(Math.abs(card.x - (viewport.width - card.x - card.width))).toBeLessThan(1);
      if (viewport === WIDE) expect(Math.abs(card.y - (viewport.height - card.y - card.height))).toBeLessThan(2);
    }
  });

  test("an app shell page is left alone", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto("examples/pages/app-page.html");
    // The shell's landmarks are its children, not the body's: main sits beside the sidebar, not in a centered column.
    const nav = await box(page.locator("dui-app-shell > nav"));
    const main = await box(page.locator("dui-app-shell > main"));
    expect(main.x).toBeGreaterThanOrEqual(nav.x + nav.width);
  });
});

/*
 * App compositions (examples/patterns/compositions.html): arrangements of
 * existing parts, so these check the parts line up, not new components.
 */
test.describe("app compositions", () => {
  const PAGE = "examples/patterns/compositions.html";

  test("a cluster row reaches the far edge, past the prose measure", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(PAGE);
    const list = await box(page.locator('[aria-labelledby="team-title"] ul'));
    const badge = await box(page.locator('[aria-labelledby="team-title"] li').first().locator("[data-badge]"));
    expect(Math.abs(list.x + list.width - (badge.x + badge.width))).toBeLessThan(1);
  });

  test("an account popover lines its text up with its links", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(PAGE);
    await page.getByRole("button", { name: "Maria Santos" }).click();
    const starts = await page.locator("#account").evaluate((pop) =>
      [...pop.querySelectorAll(":scope > p, nav a, form button")].map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect().x;
      }),
    );
    for (const x of starts) expect(Math.abs(x - starts[0])).toBeLessThan(1);
  });
});
