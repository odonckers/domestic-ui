// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { examples, schemes, withoutMotion, WCAG_TAGS, summarize } from "./helpers.js";

/*
 * App shell (css/layout/app-shell.css, web-components/dui-app-shell.js), the sidebar
 * navigation (the nav molecule as a sidebar) and the auxiliary sidebar.
 * - Landmarks: one banner, main, contentinfo, the primary navigation and the complementary
 *   auxiliary sidebar, every navigation named and the names distinct
 *   (APG Landmark Regions: https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/),
 *   placed by grid areas: header above, navigation at the inline start of main, aux at the end.
 * - Wide: a toggle collapses and restores its sidebar (aria-expanded, hidden, main wider).
 * - Narrow: a toggle opens its sidebar in a modal drawer <dialog>; Esc closes it and focus
 *   returns to the toggle. The sidebar exists once in the DOM in every mode.
 * - No JavaScript: sidebars visible, toggles hidden, axe clean, no sideways scroll at 320px.
 * - ERP page: a row selection or an order link updates the aux sidebar; the combobox, the
 *   filter bar and sorting work; targets stay at least 24px in compact density.
 * - Motion: drawer and collapse transitions are 0s under data-motion="none".
 * axe in light and dark (with the drawers open: tests/a11y.spec.js), html-validate and the
 * 320/375 checks pick the pages up on their own.
 */

const ERP = "examples/app-shell.html";
const CONTAINED = "examples/layouts/app-shell.html";
const WIDE = { width: 1440, height: 900 };
const MID = { width: 900, height: 900 };
const NARROW = { width: 375, height: 812 };

/** @param {import("@playwright/test").Locator} locator */
const box = async (locator) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error("not rendered");
  return b;
};

/** @param {import("@playwright/test").Page} page */
const menu = (page) => page.getByRole("button", { name: "Menu" });
/** @param {import("@playwright/test").Page} page */
const details = (page) => page.getByRole("button", { name: "Details" });

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

test("the app shell examples are picked up by every per-page check", () => {
  expect(examples).toContain(ERP);
  expect(examples).toContain(CONTAINED);
});

test.describe("landmarks", () => {
  test.use({ viewport: WIDE });

  test("one banner, main and contentinfo; the primary navigation and the aux sidebar, each named", async ({ page }) => {
    await page.goto(ERP);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Main", exact: true })).toHaveCount(1);
    await expect(page.getByRole("complementary", { name: "Order details" })).toHaveCount(1);
    // Several navigation landmarks: every one has a name, and no two share one.
    const names = await page.locator("nav").evaluateAll((navs) => navs.map((n) => n.getAttribute("aria-label") ?? ""));
    expect(names.every(Boolean), names.join(", ")).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  test("grid areas: header above, navigation at the inline start of main, aux at the inline end", async ({ page }) => {
    await page.goto(ERP);
    // The sidebars take their columns down to the end of the shell (past the footer row).
    const areas = await page.locator("dui-app-shell > *:not(dialog)").evaluateAll((els) => els.map((el) => [el.localName, getComputedStyle(el).gridColumnStart]));
    expect(areas).toContainEqual(["header", "header"]);
    expect(areas).toContainEqual(["nav", "start"]);
    expect(areas).toContainEqual(["main", "main"]);
    expect(areas).toContainEqual(["aside", "end"]);
    const [header, nav, main, aside] = await Promise.all(["dui-app-shell > header", "#app-nav", "dui-app-shell > main", "#app-aux"].map((s) => box(page.locator(s))));
    expect(nav.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(Math.abs(nav.y - main.y)).toBeLessThan(2);
    expect(Math.abs(aside.y - main.y)).toBeLessThan(2);
    expect(main.x).toBeGreaterThanOrEqual(nav.x + nav.width - 1);
    expect(aside.x).toBeGreaterThanOrEqual(main.x + main.width - 1);
  });

  // A sticky grid item is held by the grid container, not its grid area, in every engine:
  // the footer sits beside the sidebars, so at the page end they never cover it.
  // https://drafts.csswg.org/css-position-3/#stickypos-insets
  test("scrolled to the end at 1280x720, no sidebar covers the footer and its links take clicks", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(ERP);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => Math.ceil(window.scrollY + innerHeight) >= document.documentElement.scrollHeight)).toBe(true);
    const footer = await box(page.locator("dui-app-shell > footer"));
    for (const selector of ["#app-nav", "#app-aux"]) {
      const sidebar = await box(page.locator(selector));
      const overlapX = Math.min(sidebar.x + sidebar.width, footer.x + footer.width) - Math.max(sidebar.x, footer.x);
      const overlapY = Math.min(sidebar.y + sidebar.height, footer.y + footer.height) - Math.max(sidebar.y, footer.y);
      expect(overlapX > 0.5 && overlapY > 0.5, `${selector} overlaps the footer`).toBe(false);
    }
    const link = page.locator("dui-app-shell > footer a").first();
    const href = await link.getAttribute("href");
    await link.click(); // fails if another element intercepts the pointer
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("the skip link goes to main", async ({ page }) => {
    await page.goto(ERP);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute("href", "#main");
    await expect(page.locator("main#main")).toHaveCount(1);
  });
});

test.describe("wide: collapse", () => {
  test.use({ viewport: WIDE });
  test.beforeEach(async ({ page }) => withoutMotion(page));

  for (const [name, id] of /** @type {const} */ ([["Menu", "app-nav"], ["Details", "app-aux"]])) {
    test(`${name} collapses its sidebar, main gets wider, and it toggles back`, async ({ page }) => {
      await page.goto(ERP);
      const toggle = page.getByRole("button", { name });
      const sidebar = page.locator(`#${id}`);
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(toggle).toHaveAttribute("aria-controls", id);
      await expect(sidebar).toBeVisible();
      const before = (await box(page.locator("main"))).width;

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(sidebar).toBeHidden();
      await expect.poll(async () => (await box(page.locator("main"))).width).toBeGreaterThan(before + 100);

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(sidebar).toBeVisible();
      await expect.poll(async () => (await box(page.locator("main"))).width).toBeCloseTo(before, 0);
    });
  }

  test("Enter and Space on a toggle work like a click", async ({ page }) => {
    await page.goto(ERP);
    const toggle = menu(page);
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#app-nav")).toBeHidden();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#app-nav")).toBeVisible();
  });

  test("a collapsed sidebar is out of the Tab order", async ({ page }) => {
    await page.goto(ERP);
    await menu(page).click();
    await expect(page.locator("#app-nav")).toBeHidden();
    const tabbable = await page.locator("#app-nav a, #app-nav summary").evaluateAll((els) => els.filter((el) => el.checkVisibility()).length);
    expect(tabbable).toBe(0);
  });

  test("aria-expanded=\"false\" in the markup starts a sidebar collapsed", async ({ page }) => {
    await page.route(`**/${ERP}`, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace('aria-controls="app-aux" aria-expanded="true"', 'aria-controls="app-aux" aria-expanded="false"');
      await route.fulfill({ response, body: html });
    });
    await page.goto(ERP);
    await expect(details(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#app-aux")).toBeHidden();
    await details(page).click();
    await expect(page.locator("#app-aux")).toBeVisible();
  });
});

test.describe("narrow: drawers", () => {
  test.use({ viewport: NARROW });
  test.beforeEach(async ({ page }) => withoutMotion(page));

  for (const [name, id, edge] of /** @type {const} */ ([["Menu", "app-nav", "start"], ["Details", "app-aux", "end"]])) {
    test(`${name} opens a modal drawer at the ${edge}; Esc closes it and focus returns`, async ({ page }) => {
      await page.goto(ERP);
      const toggle = page.getByRole("button", { name });
      const sidebar = page.locator(`#${id}`);
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(sidebar).toBeHidden();

      await toggle.click();
      const dialog = page.locator("dialog[open]");
      await expect(dialog).toHaveCount(1);
      await expect(dialog).toHaveAttribute("data-dialog", `drawer ${edge}`);
      expect(await dialog.evaluate((d) => d.matches(":modal"))).toBe(true);
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(dialog.locator(`#${id}`)).toBeVisible();
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
      // Named by its heading (the toggle's text).
      await expect(page.getByRole("dialog", { name })).toBeVisible();
      // The rest of the page is inert while the modal drawer is open.
      expect(await page.locator("main").evaluate((m) => document.elementFromPoint(10, m.getBoundingClientRect().top + 10)?.closest("main") === null)).toBe(true);
      const drawer = await box(dialog);
      if (edge === "start") expect(drawer.x).toBeLessThan(1);
      else expect(drawer.x + drawer.width).toBeGreaterThan(NARROW.width - 1);

      await page.keyboard.press("Escape");
      await expect(page.locator("dialog[open]")).toHaveCount(0);
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(sidebar).toBeHidden();
      await expect.poll(() => sidebar.evaluate((el) => el.parentElement?.localName)).toBe("dui-app-shell");
    });
  }

  test("the drawer's Close button closes it", async ({ page }) => {
    await page.goto(ERP);
    await menu(page).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Close" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(menu(page)).toBeFocused();
    await expect(menu(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("the primary navigation exists once in the DOM in every mode", async ({ page }) => {
    const count = () => page.locator("nav[aria-label='Main']").count();
    await page.setViewportSize(WIDE);
    await page.goto(ERP);
    expect(await count()).toBe(1);
    await page.setViewportSize(NARROW);
    await expect(menu(page)).toHaveAttribute("aria-expanded", "false");
    expect(await count()).toBe(1);
    await menu(page).click();
    await expect(page.locator("dialog[open] nav[aria-label='Main']")).toHaveCount(1);
    expect(await count()).toBe(1);
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    expect(await count()).toBe(1);
    expect(await page.locator("#app-aux").count()).toBe(1);
  });

  test("an open drawer closes and the sidebar returns beside main when the shell gets wide", async ({ page }) => {
    await page.goto(ERP);
    await menu(page).click();
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await page.setViewportSize(WIDE);
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(menu(page)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("dui-app-shell > #app-nav")).toBeVisible();
  });

  test("between the breakpoints the navigation sits beside main and the aux sidebar is a drawer", async ({ page }) => {
    await page.setViewportSize(MID);
    await page.goto(ERP);
    await expect(menu(page)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#app-nav")).toBeVisible();
    await expect(details(page)).toHaveAttribute("aria-expanded", "false");
    await details(page).click();
    await expect(page.locator("dialog[open] #app-aux")).toBeVisible();
  });
});

test.describe("first layout", () => {
  // A module script in <head> can run before the page's style sheets apply (WebKit does it
  // when a sheet is slow): the shell has no box yet and clientWidth is 0. That must not count
  // as narrow, or a wide shell starts with its sidebar hidden for a frame.
  const HEAD_MODULE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Module in head</title>
    <link rel="stylesheet" href="../css/domestic.css">
    <script type="module" src="../web-components/dui-app-shell.js"></script>
  </head>
  <body>
    <dui-app-shell data-app-shell>
      <header><button type="button" aria-controls="nav" aria-expanded="true" hidden>Menu</button></header>
      <nav id="nav" aria-label="Main" data-nav="vertical"><ul><li><a href="#main">Home</a></li></ul></nav>
      <main id="main"><h1>Page</h1></main>
    </dui-app-shell>
  </body>
</html>`;

  for (const [name, viewport, hidden] of /** @type {const} */ ([["wide", { width: 1280, height: 720 }, false], ["narrow", NARROW, true]])) {
    test(`${name}: the sidebar is ${hidden ? "a drawer" : "shown"} at DOMContentLoaded, even when the style sheet comes late`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.route("**/examples/head-module.html", (route) => route.fulfill({ contentType: "text/html", body: HEAD_MODULE }));
      await page.route("**/css/domestic.css", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        await route.continue();
      });
      // Recorded from outside the page: an inline script would wait for the style sheet itself.
      await page.addInitScript(() => {
        document.addEventListener("DOMContentLoaded", () => {
          /** @type {any} */ (window).navHiddenAtLoad = document.getElementById("nav")?.hidden;
        });
      });
      const errors = /** @type {string[]} */ ([]);
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("examples/head-module.html");
      if (!hidden) expect(await page.evaluate(() => /** @type {any} */ (window).navHiddenAtLoad)).toBe(false);
      await expect(page.locator("#nav")).toHaveJSProperty("hidden", hidden);
      expect(errors).toEqual([]);
    });
  }
});

test.describe("the shell follows its own width, not the viewport", () => {
  test.use({ viewport: WIDE });
  test.beforeEach(async ({ page }) => withoutMotion(page));

  test("a contained shell squeezed to 30rem switches to drawers", async ({ page }) => {
    await page.goto(CONTAINED);
    const toggle = page.getByRole("button", { name: "Menu" });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.locator("dui-app-shell").evaluate((el) => {
      /** @type {HTMLElement} */ (el).style.inlineSize = "30rem";
    });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#demo-nav")).toBeHidden();
    await toggle.click();
    await expect(page.locator("dialog[open] #demo-nav")).toBeVisible();
  });

  test("main is a size container: the list-detail in it stacks although the viewport is wide", async ({ page }) => {
    await page.goto(CONTAINED);
    const main = page.locator("dui-app-shell > main");
    expect(await main.evaluate((m) => getComputedStyle(m).containerType)).toBe("inline-size");
    expect(await main.evaluate((m) => getComputedStyle(m).containerName)).toBe("dui-app-shell-main");
    const [list, detail] = await Promise.all([box(page.locator("[data-list-detail] > nav")), box(page.locator("[data-list-detail] > article"))]);
    expect(detail.y).toBeGreaterThanOrEqual(list.y + list.height - 1);
    // Collapse both sidebars: main is wide enough and the list-detail goes side by side.
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: "Activity" }).click();
    await expect.poll(async () => {
      const [l, d] = await Promise.all([box(page.locator("[data-list-detail] > nav")), box(page.locator("[data-list-detail] > article"))]);
      return d.x >= l.x + l.width - 1 && Math.abs(d.y - l.y) < 2;
    }).toBe(true);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const path of [ERP, CONTAINED]) {
    for (const viewport of [WIDE, NARROW, { width: 320, height: 640 }]) {
      test(`${path} at ${viewport.width}px: sidebars visible, no visible toggles, no sideways scroll`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(path);
        for (const sidebar of await page.locator("[data-app-shell] > :is(nav, aside)").all()) await expect(sidebar).toBeVisible();
        expect(await page.locator("[data-app-shell] button[aria-controls]").evaluateAll((all) => all.filter((b) => b.checkVisibility()).length)).toBe(0);
        await expect(page.locator("[data-app-shell] [aria-current='page']").first()).toBeVisible();
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      });
    }


  }

  for (const path of [ERP, CONTAINED, "examples/organisms/data-table.html"]) {
    test(`${path} has no visible button that needs JavaScript`, async ({ page }) => {
      for (const viewport of [WIDE, NARROW]) {
        await page.setViewportSize(viewport);
        await page.goto(path);
        expect(await deadButtons(page), `${viewport.width}px`).toEqual([]);
      }
    });
  }

  test("the bulk actions are submit buttons of a POST form that holds the row checkboxes", async ({ page }) => {
    await page.goto(ERP);
    const bulk = await bulkActionsSubmit(page, "[role='toolbar'][aria-label='Bulk actions']", "#orders-table");
    expect(bulk).toEqual({ buttons: 2, boxes: 8, submit: true, sameForm: true, method: "post" });
  });

  test("the order links and filter form are plain links and a GET form", async ({ page }) => {
    await page.goto(ERP);
    await expect(page.locator("#orders-table tbody th a").first()).toHaveAttribute("href", /^\?order=\d+$/);
    await expect(page.locator("#order-filters")).toHaveAttribute("method", "get");
    await expect(page.locator("#app-search")).toHaveAttribute("method", "get");
  });
});

// axe needs JavaScript to run, so "without JavaScript" for axe means every web component blocked.
test.describe("with every web component blocked", () => {
  for (const path of [ERP, CONTAINED]) {
    for (const colorScheme of schemes) {
      for (const viewport of [WIDE, NARROW]) {
        test(`${path} at ${viewport.width}px has no axe violations (${colorScheme})`, async ({ page }) => {
          await page.route("**/web-components/*.js", (route) => route.abort());
          await page.setViewportSize(viewport);
          await page.emulateMedia({ colorScheme });
          await page.goto(path);
          await expect(page.locator("[data-app-shell] > nav")).toBeVisible();
          const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
          expect(violations, summarize(violations)).toEqual([]);
        });
      }
    }
  }
});

test.describe("with the module blocked", () => {
  test("sidebars stay visible and no toggle shows", async ({ page }) => {
    await page.route("**/dui-app-shell.js", (route) => route.abort());
    await page.setViewportSize(NARROW);
    await page.goto(ERP);
    await expect(page.locator("#app-nav")).toBeVisible();
    await expect(page.locator("#app-aux")).toBeVisible();
    await expect(menu(page)).toBeHidden();
    await expect(details(page)).toBeHidden();
  });
});

test.describe("sidebar navigation", () => {
  test.use({ viewport: WIDE });

  test("the current link is marked and its group is open", async ({ page }) => {
    await page.goto(ERP);
    const nav = page.getByRole("navigation", { name: "Main", exact: true });
    const current = nav.locator("a[aria-current='page']");
    await expect(current).toHaveCount(1);
    await expect(current).toBeVisible();
    await expect(nav.locator("details:has(a[aria-current='page'])")).toHaveAttribute("open", "");
    const [selected, other] = await Promise.all([current, nav.locator("details a:not([aria-current])").first()].map((l) =>
      l.evaluate((a) => {
        const s = getComputedStyle(a);
        return { bar: s.borderInlineStartColor, weight: s.fontWeight };
      }),
    ));
    expect(selected.bar).not.toBe(other.bar);
    expect(selected.weight).not.toBe(other.weight);
  });

  test("groups open and close with Enter; links follow in Tab order", async ({ page }) => {
    await page.goto(ERP);
    const group = page.locator("#app-nav details").filter({ hasText: "Inventory" });
    const summary = group.locator("summary");
    await expect(group).not.toHaveAttribute("open", "");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(group).toHaveAttribute("open", "");
    await page.keyboard.press("Tab");
    await expect(group.getByRole("link", { name: "Products" })).toBeFocused();
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(group).not.toHaveAttribute("open", "");
  });

  test("icons are hidden from assistive technology; link names are their text", async ({ page }) => {
    await page.goto(ERP);
    const hidden = await page.locator("#app-nav svg").evaluateAll((svgs) => svgs.every((s) => s.getAttribute("aria-hidden") === "true"));
    expect(hidden).toBe(true);
    await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  });
});

test.describe("ERP page", () => {
  test.use({ viewport: WIDE });
  test.beforeEach(async ({ page }) => withoutMotion(page));

  test("selecting a row shows that order in the aux sidebar", async ({ page }) => {
    await page.goto(ERP);
    await expect(page.locator("#aux-title")).toHaveText("Order 1042");
    await page.getByRole("checkbox", { name: "Select order 1040" }).check();
    await expect(page.locator("#aux-title")).toHaveText("Order 1040");
    await expect(page.locator("#aux-customer")).toHaveText("Cobol Systems BV");
    await expect(page.locator("#aux-announce")).toHaveText("Order 1040 shown in Order details.");
  });

  test("activating an order link shows it without leaving the page", async ({ page }) => {
    await page.goto(ERP);
    const url = page.url();
    await page.getByRole("link", { name: "1045", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#aux-title")).toHaveText("Order 1045");
    await expect(page.locator("#aux-status")).toHaveText("On hold");
    expect(page.url()).toBe(url);
  });

  test("when narrow, an order link opens the details drawer", async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto(ERP);
    await page.getByRole("link", { name: "1041", exact: true }).click();
    await expect(page.locator("dialog[open] #app-aux")).toBeVisible();
    await expect(page.locator("#aux-title")).toHaveText("Order 1041");
    await expect(details(page)).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "1041", exact: true })).toBeFocused();
  });

  test("the filter bar's customer combobox filters the table and updates the count", async ({ page }) => {
    await page.goto(ERP);
    const customer = page.getByRole("combobox", { name: "Customer", exact: true });
    await customer.fill("cobol");
    await expect(customer).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(customer).toHaveValue("Cobol Systems BV");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator("#order-count")).toHaveText("1 order");
    await expect(page.locator("#orders-table tbody tr:not([hidden])")).toHaveCount(1);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.locator("#order-count")).toHaveText("8 orders");
  });

  test("the app bar search opens an order in the aux sidebar", async ({ page }) => {
    await page.goto(ERP);
    const search = page.getByRole("combobox", { name: "Search customers and orders" });
    await search.fill("1039");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(search).toHaveValue("Order 1039");
    await page.keyboard.press("Enter");
    await expect(page.locator("#aux-title")).toHaveText("Order 1039");
  });

  test("the table sorts by a column", async ({ page }) => {
    await page.goto(ERP);
    const total = page.getByRole("columnheader", { name: /Total/ });
    await total.getByRole("button").click();
    await expect(total).toHaveAttribute("aria-sort", "ascending");
    await expect(page.locator("#orders-table tbody tr").first().locator("td").last()).toHaveText("€48.50");
    await total.getByRole("button").click();
    await expect(total).toHaveAttribute("aria-sort", "descending");
    await expect(page.locator("#orders-table tbody tr").first().locator("td").last()).toHaveText("€5,210.75");
  });

  test("every target in the shell is at least 24 by 24 CSS pixels in compact density", async ({ page }) => {
    await page.goto(ERP);
    await page.evaluate(() => (document.documentElement.dataset.density = "compact"));
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("dui-app-shell :is(a[href], button, input, select, summary, [tabindex]:not([tabindex='-1']))")]
        .filter((el) => !(el.localName === "a" && getComputedStyle(el).display === "inline"))
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => (el.matches("input[type='checkbox']") ? /** @type {Element} */ (el.closest("label")) : el))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width < 24 || r.height < 24)
        .map(({ el, r }) => `${el.localName} "${(el.textContent ?? "").trim().slice(0, 30)}": ${r.width}×${r.height}`),
    );
    expect(small).toEqual([]);
  });
});

test.describe("motion", () => {
  test("drawer and collapse transitions are 0s under data-motion=\"none\"", async ({ page }) => {
    await withoutMotion(page);
    await page.setViewportSize(NARROW);
    await page.goto(ERP);
    await menu(page).click();
    const durations = await page.locator("dialog[open]").evaluate((d) => [getComputedStyle(d).transitionDuration, getComputedStyle(d, "::backdrop").transitionDuration]);
    for (const value of durations) expect(value.split(",").every((v) => parseFloat(v) === 0), value).toBe(true);
    await page.keyboard.press("Escape");
    await page.setViewportSize(WIDE);
    const shell = await page.locator("dui-app-shell").evaluate((s) => getComputedStyle(s).transitionDuration);
    expect(shell.split(",").every((v) => parseFloat(v) === 0), shell).toBe(true);
    const sidebar = await page.locator("#app-nav").evaluate((s) => getComputedStyle(s).transitionDuration);
    expect(sidebar.split(",").every((v) => parseFloat(v) === 0), sidebar).toBe(true);
  });

  test("by default the collapse animates the columns; reduced motion makes it instant", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto(ERP);
    const duration = () => page.locator("dui-app-shell").evaluate((s) => parseFloat(getComputedStyle(s).transitionDuration));
    expect(await duration()).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await duration()).toBe(0);
  });
});
