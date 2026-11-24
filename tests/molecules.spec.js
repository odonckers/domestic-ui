// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { schemes, withoutMotion } from "./helpers.js";

/*
 * Molecule behavior: keyboard interaction checked against the APG patterns,
 * states through the accessibility APIs Playwright exposes (getByRole with
 * selected/expanded/pressed, toHaveAccessibleName, toHaveAccessibleDescription),
 * no-JavaScript fallbacks, fallbacks for engine-specific features, rendered
 * indicator contrast, and scoped theming. Axe runs on every page and revealed
 * state in a11y.spec.js; token contrast pairs live in tokens.spec.js.
 */

/** Wait for CSS transitions to finish, so geometry and colors are final. */
const settle = (/** @type {import("@playwright/test").Page} */ page) =>
  page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

/**
 * Delete every CSS rule of a given type (and every rule whose text matches) from
 * the page's style sheets, including imported and layered ones. Used to test the
 * fallback path of a feature in engines that do support it.
 * @param {import("@playwright/test").Page} page
 * @param {string} pattern matched against each rule's cssText
 */
const deleteRules = (page, pattern) =>
  page.evaluate((source) => {
    const re = new RegExp(source);
    let removed = 0;
    /** @param {CSSStyleSheet | CSSGroupingRule | CSSLayerBlockRule} parent */
    const walk = (parent) => {
      const rules = parent.cssRules;
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (rule instanceof CSSImportRule && rule.styleSheet) walk(rule.styleSheet);
        else if (re.test(rule.cssText.split("{")[0])) {
          parent.deleteRule(i);
          removed++;
        } else if ("cssRules" in rule) walk(/** @type {CSSGroupingRule} */ (rule));
      }
    };
    for (const sheet of document.styleSheets) walk(sheet);
    return removed;
  }, pattern);

/**
 * Chromium only: read a property from the accessibility tree through the
 * Chrome DevTools Protocol (the same approach as the field test in atoms.spec.js).
 * @param {import("@playwright/test").Page} page
 * @param {string} selector
 */
const axNode = async (page, selector) => {
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
  return nodes[0];
};

test.describe("disclosure and accordion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("examples/molecules/disclosure.html");
  });

  test("Enter and Space toggle a section; an exclusive group keeps one open", async ({ page, browserName }) => {
    const section = (name) => page.locator("#accordion-title ~ .demo details", { has: page.locator("summary", { hasText: name }) });
    await expect(section("Shipping")).toHaveAttribute("open");
    await page.locator("summary", { hasText: "Returns" }).focus();
    await page.keyboard.press("Enter");
    await expect(section("Returns")).toHaveAttribute("open");
    await expect(section("Shipping")).not.toHaveAttribute("open");
    await expect(section("Warranty")).not.toHaveAttribute("open");
    await page.keyboard.press("Space");
    await expect(section("Returns")).not.toHaveAttribute("open");

    // The summary is exposed with an expanded state (HTML-AAM). Chromium exposes it through CDP.
    if (browserName === "chromium") {
      await page.keyboard.press("Enter");
      const node = await axNode(page, "#accordion-title ~ .demo details:nth-child(2) > summary");
      expect(node.properties?.find((p) => p.name === "expanded")?.value.value).toBe(true);
    }
  });

  test("groups without a name can have several open", async ({ page }) => {
    const summaries = page.locator("#multi-title ~ .demo summary");
    for (const summary of await summaries.all()) {
      await summary.focus();
      await page.keyboard.press("Enter");
    }
    await expect(page.locator("#multi-title ~ .demo details[open]")).toHaveCount(2);
  });
});

test.describe("dialog and drawer", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto("examples/molecules/dialog.html");
  });

  test("modal dialog: focus moves in, Esc closes, focus returns to the invoker", async ({ page }) => {
    const opener = page.getByRole("button", { name: "Delete project…" });
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Delete project?" });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused(); // autofocus
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("submit buttons in a method=dialog form close it with a return value", async ({ page }) => {
    await page.getByRole("button", { name: "Delete project…" }).click();
    await page.getByRole("button", { name: "Delete project", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await page.locator("#confirm-dialog").evaluate((el) => /** @type {HTMLDialogElement} */ (el).returnValue)).toBe("delete");
  });

  for (const [name, edge] of [["Filters", "end"], ["Menu", "start"]]) {
    test(`drawer (${edge}) sits at the inline ${edge} edge, full height, and closes with Esc`, async ({ page }) => {
      const opener = page.getByRole("button", { name, exact: true });
      await opener.click();
      const drawer = page.getByRole("dialog", { name });
      await expect(drawer).toBeVisible();
      await settle(page);
      await expect(drawer.getByRole("button", { name: "Close" })).toBeFocused();
      const geometry = await drawer.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, height: r.height, vw: document.documentElement.clientWidth, vh: innerHeight };
      });
      expect(geometry.top).toBeCloseTo(0, 0);
      expect(geometry.height).toBeCloseTo(geometry.vh, 0);
      if (edge === "end") expect(geometry.right).toBeGreaterThanOrEqual(geometry.vw - 1);
      else expect(geometry.left).toBeCloseTo(0, 0);
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(opener).toBeFocused();
    });
  }

  test("drawer header: title and Close share a middle line; the header stays at the top edge when the drawer scrolls", async ({ page }) => {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await settle(page);
    const centers = await drawer.evaluate((el) => {
      const mid = (/** @type {Element} */ e) => {
        const r = e.getBoundingClientRect();
        return r.top + r.height / 2;
      };
      return { title: mid(/** @type {Element} */ (el.querySelector("header > h2"))), close: mid(/** @type {Element} */ (el.querySelector("header > button"))) };
    });
    expect(Math.abs(centers.title - centers.close)).toBeLessThan(1);
    // Scrolled: no strip of content shows above the sticky header (it sits at the drawer's top edge).
    const tops = await drawer.evaluate((el) => {
      const filler = document.createElement("div");
      filler.style.blockSize = "300vh";
      el.append(filler);
      el.scrollTop = 200;
      return { drawer: el.getBoundingClientRect().top, header: /** @type {Element} */ (el.querySelector("header")).getBoundingClientRect().top, scrolled: el.scrollTop };
    });
    expect(tops.scrolled).toBeGreaterThan(0);
    expect(Math.abs(tops.header - tops.drawer)).toBeLessThan(1);
  });

  // The ::highlight(dui-code-*) rules are scoped to <code>: WebKit painted an unscoped one on the
  // title of a modal dialog that no range covered.
  test("code highlights never paint a modal drawer's title", async ({ page, browserName }) => {
    test.skip(!(await page.evaluate(() => "highlights" in CSS)), `CSS Custom Highlight API is not supported in this ${browserName} build`);
    const target = await page.evaluate(() => {
      const code = /** @type {HTMLElement} */ (document.querySelector("main code"));
      const range = new Range();
      range.selectNodeContents(code);
      CSS.highlights.set("dui-code-string", new Highlight(range));
      const probe = document.createElement("span");
      probe.style.color = "var(--dui-color-code-string)";
      document.body.append(probe);
      const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      ctx.fillStyle = getComputedStyle(probe).color;
      ctx.fillRect(0, 0, 1, 1);
      const rgb = [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      probe.remove();
      return rgb;
    });
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const title = page.getByRole("dialog", { name: "Menu" }).locator("header > h2");
    await settle(page);
    const png = (await title.screenshot()).toString("base64");
    const near = await page.evaluate(
      async ([data, rgb]) => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, img.width, img.height).data;
        let count = 0;
        for (let i = 0; i < px.length; i += 4) if (Math.abs(px[i] - rgb[0]) + Math.abs(px[i + 1] - rgb[1]) + Math.abs(px[i + 2] - rgb[2]) < 60) count++;
        return count;
      },
      /** @type {[string, number[]]} */ ([png, target]),
    );
    expect(near, "title pixels in the string highlight color").toBe(0);
  });

  test("drawer edges follow the writing direction (right-to-left)", async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    await page.getByRole("button", { name: "Filters" }).click();
    const drawer = page.getByRole("dialog", { name: "Filters" });
    await settle(page);
    expect(await drawer.evaluate((el) => el.getBoundingClientRect().left)).toBeCloseTo(0, 0);
  });

  test("closedby=any closes on a backdrop click; without closedby, Esc and Close still work", async ({ page }) => {
    const opener = page.getByRole("button", { name: "Filters" });
    const drawer = page.getByRole("dialog", { name: "Filters" });
    await opener.click();
    await settle(page);
    await page.mouse.click(10, 300); // the backdrop, away from the end-edge drawer
    await expect(drawer).toBeHidden();

    // Fallback path: an engine without closedby treats the dialog as a plain modal.
    await page.locator("#filters-drawer").evaluate((el) => el.removeAttribute("closedby"));
    await opener.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await opener.click();
    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(drawer).toBeHidden();
  });

  test("open transition: runs with motion, and the fallback without @starting-style still opens and closes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.reload();
    await page.evaluate(() => document.documentElement.removeAttribute("data-motion"));
    const drawer = page.locator("#filters-drawer");
    expect(await drawer.evaluate((el) => getComputedStyle(el).transitionDuration)).not.toMatch(/^0s(, 0s)*$/);

    expect(await deleteRules(page, "^@starting-style")).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Filters" }).click();
    await expect(drawer).toBeVisible();
    await settle(page);
    expect(await drawer.evaluate((el) => getComputedStyle(el).translate)).toMatch(/^(none|0px( 0px)?)$/);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("reduced motion: the drawer fades in place, it does not slide", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.evaluate(() => document.documentElement.removeAttribute("data-motion"));
    const timing = await page.locator("#filters-drawer").evaluate((el) => {
      const style = getComputedStyle(el);
      const durations = style.transitionDuration.split(",").map((d) => Number.parseFloat(d));
      return Object.fromEntries(style.transitionProperty.split(",").map((p, i) => [p.trim(), durations[i % durations.length]]));
    });
    expect(timing.translate).toBe(0);
    expect(timing.opacity).toBeGreaterThan(0);
  });

  test("data-motion=none: no transition time", async ({ page }) => {
    const durations = await page.locator("#filters-drawer").evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(durations.split(",").every((d) => Number.parseFloat(d) === 0)).toBe(true);
  });

  test("non-modal dialog leaves the page usable and closes on Esc", async ({ page }) => {
    const opener = page.getByRole("button", { name: "Show a note" });
    await opener.click();
    const note = page.getByRole("dialog", { name: "Autosave is on" });
    await expect(note).toBeVisible();
    expect(await note.evaluate((el) => el.matches(":modal"))).toBe(false);
    await page.getByRole("button", { name: "Delete project…" }).focus(); // outside the dialog: not inert
    await expect(page.getByRole("button", { name: "Delete project…" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(note).toBeHidden();
  });
});

test.describe("popover and tooltip", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto("examples/molecules/popover.html");
  });

  test("auto popover: opens from its button, anchored below it; Esc closes and returns focus", async ({ page, browserName }) => {
    const button = page.getByRole("button", { name: "Share" });
    const popover = page.locator("#share-popover");
    await button.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(popover).toBeVisible();
    // popovertarget maps to the expanded state natively (HTML-AAM); Playwright's role engine does not
    // compute it, so read it from Chromium's accessibility tree.
    if (browserName === "chromium") {
      const node = await axNode(page, 'button[popovertarget="share-popover"]');
      expect(node.properties?.find((p) => p.name === "expanded")?.value.value).toBe(true);
    }
    const [b, p] = await Promise.all([button.boundingBox(), popover.boundingBox()]);
    const buttonBottom = (b?.y ?? 0) + (b?.height ?? 0);
    expect(p?.y).toBeGreaterThanOrEqual(buttonBottom - 1);
    expect(p?.y).toBeLessThan(buttonBottom + 24);
    expect(p?.x).toBeCloseTo(b?.x ?? 0, -1); // aligned to the button's start edge
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("near the bottom of the viewport the popover flips above its button", async ({ page }) => {
    const button = page.getByRole("button", { name: "Share" });
    const popover = page.locator("#share-popover");
    // Shrink the viewport so the button sits just above its bottom edge. Where the
    // button lands depends on font metrics, so scrolling alone left room below it
    // on CI and the popover had no reason to flip.
    await page.evaluate(() => window.scrollTo(0, 0));
    const before = await button.boundingBox();
    const width = page.viewportSize()?.width ?? 1280;
    const height = Math.ceil((before?.y ?? 0) + (before?.height ?? 0) + 8);
    await page.setViewportSize({ width, height });
    await page.waitForFunction((h) => window.innerHeight === h, height);
    // Open from the keyboard: click() scrolls the button toward the middle first.
    await button.evaluate((el) => el.focus({ preventScroll: true }));
    await page.keyboard.press("Enter");
    await expect(popover).toBeVisible();
    const [b, p] = await Promise.all([button.boundingBox(), popover.boundingBox()]);
    expect((p?.y ?? 0) + (p?.height ?? 0)).toBeLessThanOrEqual((b?.y ?? 0) + 1);
  });

  test("auto popover light-dismisses on a click outside", async ({ page }) => {
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.locator("#share-popover")).toBeVisible();
    await page.locator("h1").click();
    await expect(page.locator("#share-popover")).toBeHidden();
  });

  test("manual popover stays open until its close button", async ({ page }) => {
    await page.getByRole("button", { name: "Help" }).click();
    const help = page.locator("#help-popover");
    await expect(help).toBeVisible();
    await page.locator("#above-title").click(); // outside the popover, near enough to keep its anchor in view
    await expect(help).toBeVisible();
    await help.getByRole("button", { name: "Close" }).click();
    await expect(help).toBeHidden();
  });

  test("without anchor positioning the popover falls back to the bottom of the viewport", async ({ page }) => {
    expect(await deleteRules(page, "^@supports \\(position-area")).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Share" }).click();
    const box = await page.locator("#share-popover").boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    if (!box || !viewport) return;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.y + box.height).toBeGreaterThan(viewport.height - 64);
    expect(box.x).toBeGreaterThan(0);
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
  });

  test("tooltip supplements the name, shows on focus, hides on Esc without moving focus", async ({ page }) => {
    const save = page.getByRole("button", { name: "Save", exact: true });
    const tip = page.locator("#save-tip");
    await expect(save).toHaveAccessibleDescription("Shortcut: Ctrl+S");
    await expect(page.getByRole("button", { name: "Copy link" })).toHaveAccessibleDescription("Copies the page address");
    await expect(tip).toBeHidden();
    await page.getByRole("link", { name: "interestfor", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(save).toBeFocused();
    await expect(tip).toBeVisible();
    await expect(page.getByRole("tooltip")).toHaveText("Shortcut: Ctrl+S");
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
    await expect(save).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#copy-tip")).toBeVisible();
    await expect(tip).toBeHidden();
  });

  test("tooltip shows on hover and stays while the pointer moves onto it (WCAG 1.4.13)", async ({ page }) => {
    const tip = page.locator("#save-tip");
    await page.getByRole("button", { name: "Save", exact: true }).hover();
    await expect(tip).toBeVisible();
    const box = await tip.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(300);
    await expect(tip).toBeVisible();
    await page.mouse.move(5, 5);
    await expect(tip).toBeHidden();
  });

  test("where popover=hint is unsupported it falls back to manual; the component still shows and hides it", async ({ page }) => {
    await page.locator("#save-tip").evaluate((el) => el.setAttribute("popover", "manual"));
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.focus();
    await expect(page.locator("#save-tip")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#save-tip")).toBeHidden();
    await expect(save).toBeFocused();
  });
});

test.describe("nav list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("examples/molecules/nav.html");
  });

  test("aria-current marks the current page; Enter and Space toggle groups", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: "Sidebar example" });
    await expect(sidebar.getByRole("link", { name: "Active" })).toHaveAttribute("aria-current", "page");
    await expect(sidebar.locator("[aria-current]")).toHaveCount(1);

    const settings = sidebar.locator("details", { has: page.locator("summary", { hasText: "Settings" }) });
    await expect(settings).not.toHaveAttribute("open");
    await settings.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(settings).toHaveAttribute("open");
    await expect(sidebar.getByRole("link", { name: "Billing" })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(settings).not.toHaveAttribute("open");
    await expect(sidebar.getByRole("link", { name: "Billing" })).toBeHidden();
  });

  test("Tab moves through links and summaries, not arrow keys (not a menu)", async ({ page }) => {
    const sidebar = page.getByRole("navigation", { name: "Sidebar example" });
    await sidebar.getByRole("link", { name: "Overview" }).focus();
    await page.keyboard.press("Tab");
    await expect(sidebar.locator("summary", { hasText: "Projects" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(sidebar.getByRole("link", { name: "Active" })).toBeFocused();
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  // https://w3c.github.io/aria/#aria-current: any value but "false" (or empty) means current.
  test("a horizontal top-level link with aria-current=\"true\" (current section) is marked like \"page\"", async ({ page }) => {
    const bar = page.getByRole("navigation", { name: "Top bar example" });
    const styles = await bar.evaluate((nav) => {
      const list = /** @type {HTMLElement} */ (nav.querySelector(":scope > ul"));
      /** @param {string | null} value */
      const add = (value) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#horizontal-title";
        a.textContent = `Section ${value}`;
        if (value !== null) a.setAttribute("aria-current", value);
        li.append(a);
        list.append(li);
        const cs = getComputedStyle(a);
        return [cs.borderBottomColor, cs.backgroundColor, cs.fontWeight].join(" | ");
      };
      return { page: add("page"), true: add("true"), location: add("location"), false: add("false"), empty: add(""), none: add(null) };
    });
    expect(styles.true).toBe(styles.page);
    expect(styles.location).toBe(styles.page);
    expect(styles.false).toBe(styles.none);
    expect(styles.empty).toBe(styles.none);
    expect(styles.none).not.toBe(styles.page);
  });

  test("horizontal groups open as dropdowns, one at a time", async ({ page }) => {
    const bar = page.getByRole("navigation", { name: "Top bar example" });
    const products = bar.locator("details", { hasText: "Products" });
    const company = bar.locator("details", { hasText: "Company" });
    await products.locator("summary").click();
    await expect(bar.getByRole("link", { name: "Icons" })).toBeVisible();
    const position = await products.locator("ul").evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("absolute");
    await company.locator("summary").click();
    await expect(company).toHaveAttribute("open");
    await expect(products).not.toHaveAttribute("open");
  });
});

test.describe("breadcrumb", () => {
  test("ordered list in a named landmark; separators are not read; last item is current", async ({ page }) => {
    await page.goto("examples/molecules/breadcrumb.html");
    const trail = page.getByRole("navigation", { name: "Breadcrumb", exact: true });
    await expect(trail).toMatchAriaSnapshot(`
      - navigation "Breadcrumb":
        - list:
          - listitem:
            - link "Home"
          - listitem:
            - link "Molecules"
          - listitem:
            - link "Breadcrumb"
    `);
    expect(await trail.evaluate((el) => el.querySelector("ol") !== null)).toBe(true);
    await expect(trail.getByRole("link").last()).toHaveAttribute("aria-current", "page");
    // The separator is drawn, but has empty alternative text.
    const separator = await trail.locator("li").nth(1).evaluate((el) => getComputedStyle(el, "::before").content);
    expect(separator).toContain("/");
  });
});

test.describe("tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("examples/molecules/tabs.html");
  });

  const settings = (page) => page.getByRole("tablist", { name: "Account settings" });

  test("roles, states and relationships follow the APG", async ({ page }) => {
    const list = settings(page);
    await expect(list.getByRole("tab")).toHaveCount(3);
    const profile = list.getByRole("tab", { name: "Profile", selected: true });
    await expect(profile).toBeVisible();
    await expect(list.getByRole("tab", { selected: false })).toHaveCount(2);
    const panelId = await profile.getAttribute("aria-controls");
    const panel = page.locator(`[id="${panelId}"]`);
    await expect(panel).toHaveAttribute("role", "tabpanel");
    await expect(panel).toHaveAccessibleName("Profile");
    await expect(panel).toBeVisible();
    await expect(page.locator("#tab-security")).toBeHidden();
    await expect(page.locator("#tab-notifications")).toBeHidden();
  });

  test("only the selected tab is in the tab order; Tab moves on to the panel", async ({ page }) => {
    const list = settings(page);
    await expect(list.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await page.getByRole("link", { name: "APG Tabs", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(list.getByRole("tab", { name: "Profile" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#tab-profile")).toBeFocused(); // no focusable content: the panel itself
  });

  test("arrow keys move focus and selection, wrapping; Home and End", async ({ page }) => {
    const list = settings(page);
    const tab = (name) => list.getByRole("tab", { name });
    await tab("Profile").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab("Security")).toBeFocused();
    await expect(tab("Security")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#tab-security")).toBeVisible();
    await expect(page.locator("#tab-profile")).toBeHidden();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(tab("Profile")).toBeFocused(); // wrapped
    await page.keyboard.press("ArrowLeft");
    await expect(tab("Notifications")).toBeFocused(); // wrapped back
    await expect(tab("Notifications")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(tab("Profile")).toBeFocused();
    await page.keyboard.press("End");
    await expect(tab("Notifications")).toBeFocused();
    await expect(list.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect(list.getByRole("tab", { selected: true })).toHaveCount(1);
  });

  test("a panel with focusable content is reached through that content", async ({ page }) => {
    const list = settings(page);
    await list.getByRole("tab", { name: "Security" }).click();
    await expect(list.getByRole("tab", { name: "Security" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "Recovery code" })).toBeFocused();
    await expect(page.locator("#tab-security")).not.toHaveAttribute("tabindex");
  });

  test("clicking a tab selects it without changing the URL", async ({ page }) => {
    const url = page.url();
    await settings(page).getByRole("tab", { name: "Notifications" }).click();
    await expect(settings(page).getByRole("tab", { name: "Notifications", selected: true })).toBeVisible();
    expect(page.url()).toBe(url);
  });

  test("manual activation: arrows move focus only; Enter and Space select", async ({ page }) => {
    const list = page.getByRole("tablist", { name: "Report period" });
    const tab = (name) => list.getByRole("tab", { name });
    await expect(tab("Month")).toHaveAttribute("aria-selected", "true"); // from aria-current="true" in the markup
    await expect(tab("Month")).not.toHaveAttribute("aria-current");
    await tab("Month").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab("Year")).toBeFocused();
    await expect(tab("Year")).toHaveAttribute("aria-selected", "false");
    await expect(page.locator("#tab-month")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(tab("Year")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#tab-year")).toBeVisible();
    await page.keyboard.press("Home");
    await page.keyboard.press("Space");
    await expect(tab("Week")).toHaveAttribute("aria-selected", "true");
  });

  test("right-to-left: Left Arrow moves to the next tab", async ({ page }) => {
    const list = page.getByRole("tablist", { name: "الإعدادات" });
    const tabs = list.getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(tabs.first()).toBeFocused();
  });

  test("the URL fragment selects a tab on load and on hashchange", async ({ page }) => {
    await page.goto("examples/molecules/tabs.html#tab-notifications");
    await expect(settings(page).getByRole("tab", { name: "Notifications", selected: true })).toBeVisible();
    await page.evaluate(() => (location.hash = "#tab-security"));
    await expect(settings(page).getByRole("tab", { name: "Security", selected: true })).toBeVisible();
  });

  test("dui-tabs-change fires with the tab and panel", async ({ page }) => {
    const detail = page.evaluate(
      () =>
        new Promise((resolve) =>
          document.addEventListener("dui-tabs-change", (e) => resolve({ tab: e.detail.tab.textContent, panel: e.detail.panel.id }), { once: true }),
        ),
    );
    await settings(page).getByRole("tab", { name: "Security" }).click();
    expect(await detail).toEqual({ tab: "Security", panel: "tab-security" });
  });
});

test.describe("menu button", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto("examples/molecules/menu-button.html");
  });

  const parts = (page) => ({
    button: page.getByRole("button", { name: "Actions" }),
    menu: page.getByRole("menu", { name: "Actions" }),
    item: (name) => page.getByRole("menuitem", { name }),
  });

  test("button and menu expose the APG roles and states", async ({ page }) => {
    const { button, menu } = parts(page);
    await expect(button).toHaveAttribute("aria-haspopup", "menu");
    await expect(page.getByRole("button", { name: "Actions", expanded: false })).toBeVisible();
    await button.click();
    await expect(menu).toBeVisible();
    await expect(page.getByRole("button", { name: "Actions", expanded: true })).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveCount(4);
    await expect(menu.getByRole("separator")).toHaveCount(1);
  });

  for (const key of ["Enter", "Space", "ArrowDown"]) {
    test(`${key} on the button opens the menu and focuses the first item`, async ({ page }) => {
      const { button, menu, item } = parts(page);
      await button.focus();
      await page.keyboard.press(key);
      await expect(menu).toBeVisible();
      await expect(item("Edit")).toBeFocused();
    });
  }

  test("Up Arrow on the button opens the menu and focuses the last item", async ({ page }) => {
    const { button, item } = parts(page);
    await button.focus();
    await page.keyboard.press("ArrowUp");
    await expect(item("Delete")).toBeFocused();
  });

  test("arrows wrap, Home and End jump, a letter jumps to the next match", async ({ page }) => {
    const { button, item } = parts(page);
    await button.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(item("Duplicate")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(item("Delete")).toBeFocused(); // wrapped
    await page.keyboard.press("ArrowDown");
    await expect(item("Edit")).toBeFocused(); // wrapped
    await page.keyboard.press("End");
    await expect(item("Delete")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(item("Edit")).toBeFocused();
    await page.keyboard.press("d");
    await expect(item("Duplicate")).toBeFocused();
    await page.keyboard.press("d");
    await expect(item("Delete")).toBeFocused();
    // Items are not Tab stops.
    await expect(page.locator('[role="menuitem"][tabindex="-1"]')).toHaveCount(4);
  });

  test("Esc closes the menu and returns focus to the button", async ({ page }) => {
    const { button, menu } = parts(page);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("Tab closes the menu and moves focus on", async ({ page }) => {
    const { button, menu } = parts(page);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(menu).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.closest("[role='menu']") ?? null)).toBeNull();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("activating an item runs it, closes the menu and returns focus", async ({ page }) => {
    const { button, menu } = parts(page);
    await button.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(page.getByRole("status")).toHaveText("Duplicate chosen.");
  });

  test("a popover of links has no menu roles", async ({ page }) => {
    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByRole("link", { name: "Billing" })).toBeVisible();
    await expect(page.locator("#account-links")).not.toHaveAttribute("role");
    await expect(page.getByRole("menuitem")).toHaveCount(0);
  });
});

test.describe("toolbar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("examples/molecules/toolbar.html");
  });

  test("one Tab stop, roving tabindex, arrows wrap, Home and End", async ({ page }) => {
    const toolbar = page.getByRole("toolbar", { name: "Text formatting" });
    const button = (name) => toolbar.getByRole("button", { name });
    await expect(toolbar.locator('[tabindex="0"]')).toHaveCount(1);
    await page.getByRole("link", { name: "APG Toolbar", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(button("Bold")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(button("Italic")).toBeFocused();
    await page.keyboard.press("End");
    await expect(button("Clear formatting")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(button("Bold")).toBeFocused(); // wrapped
    await page.keyboard.press("ArrowLeft");
    await expect(button("Clear formatting")).toBeFocused(); // wrapped
    await page.keyboard.press("Home");
    await expect(button("Bold")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(button("Underline")).toBeFocused();
    // Tab leaves the toolbar (for the next toolbar's one tab stop); Shift+Tab comes back to the last focused control.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("toolbar", { name: "Drawing tools" }).locator('[tabindex="0"]')).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(button("Underline")).toBeFocused();
    await expect(toolbar.locator('[tabindex="0"]')).toHaveCount(1);
  });

  test("vertical toolbars use Up and Down", async ({ page }) => {
    const toolbar = page.getByRole("toolbar", { name: "Drawing tools" });
    await expect(toolbar).toHaveAttribute("aria-orientation", "vertical");
    await toolbar.getByRole("button", { name: "Select" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(toolbar.getByRole("button", { name: "Pen" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(toolbar.getByRole("button", { name: "Pen" })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(toolbar.getByRole("button", { name: "Eraser" })).toBeFocused();
  });

  test("toggle buttons expose aria-pressed", async ({ page }) => {
    const toolbar = page.getByRole("toolbar", { name: "Text formatting" });
    await expect(toolbar.getByRole("button", { name: "Bold", pressed: true })).toBeVisible();
    await toolbar.getByRole("button", { name: "Italic" }).focus();
    await page.keyboard.press("Space");
    await expect(toolbar.getByRole("button", { name: "Italic", pressed: true })).toBeVisible();
    // Pressed differs from not pressed by more than color: a doubled border.
    const shadow = (name) => toolbar.getByRole("button", { name }).evaluate((el) => getComputedStyle(el).boxShadow);
    expect(await shadow("Bold")).not.toBe(await shadow("Underline"));
  });
});

test.describe("pagination", () => {
  test("named links, current page, and a disabled end that is not a link", async ({ page }) => {
    await page.goto("examples/molecules/pagination.html");
    const middle = page.getByRole("navigation", { name: "Pagination", exact: true });
    await expect(middle.getByRole("link", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
    await expect(middle.getByRole("link", { name: "Previous page" })).toHaveAttribute("rel", "prev");
    await expect(middle.getByRole("link", { name: "Next page" })).toHaveAttribute("rel", "next");
    await expect(middle.getByRole("link")).toHaveCount(7);

    const first = page.getByRole("navigation", { name: "Pagination, search results" });
    await expect(first.getByRole("link", { name: "Previous page" })).toHaveCount(0);
    await expect(first.getByText("Previous")).toBeVisible();
    await first.locator("a:not([href])").focus();
    await expect(first.locator("a:not([href])")).not.toBeFocused();
    await expect(first.getByRole("link", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
  });

  test("every page link is at least the 36px control size", async ({ page }) => {
    await page.goto("examples/molecules/pagination.html");
    for (const link of await page.locator("[data-pagination] a").all()) {
      const box = await link.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(36);
      expect(box?.height).toBeGreaterThanOrEqual(36);
    }
  });
});

test.describe("search", () => {
  test("search landmark with a labelled searchbox that submits on Enter", async ({ page }) => {
    await page.goto("examples/molecules/search.html");
    const guides = page.getByRole("search", { name: "Guides" });
    const box = guides.getByRole("searchbox", { name: "Search the guides" });
    await expect(box).toHaveAccessibleDescription('Try "tokens" or "dialog".');
    await expect(page.getByRole("search", { name: "Site" }).getByRole("searchbox", { name: "Search this site" })).toBeVisible();
    // Field and button share a row.
    const [field, button] = await Promise.all([box.boundingBox(), guides.getByRole("button", { name: "Search" }).boundingBox()]);
    expect(Math.abs((field?.y ?? 0) + (field?.height ?? 0) - ((button?.y ?? 0) + (button?.height ?? 0)))).toBeLessThan(2);
    await box.fill("tokens");
    await box.press("Enter");
    await expect(page).toHaveURL(/search\.html\?q=tokens$/);
  });
});

test.describe("card", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("examples/molecules/card.html");
  });

  test("the whole card follows its heading link, whose name is only the heading", async ({ page }) => {
    const card = page.locator("article", { has: page.getByRole("heading", { name: "Theming guide" }) });
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("link", { name: "Theming guide" })).toHaveAccessibleName("Theming guide");
    // A click on the card body, away from the heading, hits the link's overlay.
    const body = await card.locator("p").boundingBox();
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.textContent, {
      x: (body?.x ?? 0) + 10,
      y: (body?.y ?? 0) + 5,
    });
    expect(hit).toBe("Theming guide");
  });

  test("secondary actions stay clickable and focusable above the overlay", async ({ page }) => {
    const action = page.getByRole("link", { name: "View tokens" });
    await action.scrollIntoViewIfNeeded();
    const box = await action.boundingBox();
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.textContent, {
      x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
      y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
    });
    expect(hit).toBe("View tokens");
    await page.getByRole("link", { name: "Theming guide" }).focus();
    await page.keyboard.press("Tab");
    await expect(action).toBeFocused();
  });

  test("the focus ring moves to the whole card", async ({ page }) => {
    const link = page.getByRole("link", { name: "Theming guide" });
    await page.getByRole("link", { name: "Choose Starter" }).focus();
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    const ring = await link.evaluate((el) => {
      const after = getComputedStyle(el, "::after");
      const card = /** @type {HTMLElement} */ (el.closest("article")).getBoundingClientRect();
      return { style: after.outlineStyle, width: Number.parseFloat(after.outlineWidth), position: after.position, cardWidth: card.width };
    });
    expect(ring.style).toBe("solid");
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.position).toBe("absolute");
  });
});

test.describe("alerts and toasts", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.goto("examples/molecules/alerts.html");
  });

  test("tone is written as a word and drawn as an icon, not color alone", async ({ page }) => {
    for (const [tone, word] of [["info", "Info:"], ["success", "Success:"], ["warning", "Warning:"], ["danger", "Error:"]]) {
      const alert = page.locator(`main [data-alert="${tone}"]`);
      await expect(alert.locator("strong").first()).toHaveText(word);
      const icon = await alert.evaluate((el) => getComputedStyle(el, "::before").content);
      expect(icon).not.toBe("none");
    }
  });

  test("live regions exist before their text changes", async ({ page }) => {
    await expect(page.locator("#live-status")).toHaveAttribute("role", "status");
    await expect(page.locator("#live-status")).toBeEmpty();
    await expect(page.locator("#live-alert")).toBeEmpty();
    await expect(page.locator("dui-toaster")).toHaveAttribute("role", "status");
    await expect(page.locator("dui-toaster")).toBeEmpty();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.locator("#live-status")).toHaveText("Settings saved.");
    await page.getByRole("button", { name: "Send without a subject" }).click();
    await expect(page.getByRole("alert")).toHaveText("Error: add a subject before sending.");
  });

  test("toasts appear in the status region, never take focus, and do not dismiss themselves", async ({ page }) => {
    const copy = page.getByRole("button", { name: "Copy link" });
    await copy.click();
    const toaster = page.locator("dui-toaster");
    await expect(toaster.locator("[data-alert='success']")).toHaveText(/Success: Link copied\./);
    await expect(copy).toBeFocused();
    await expect(toaster.getByRole("button", { name: "Dismiss" })).toHaveAccessibleDescription("Success: Link copied.");
    await page.waitForTimeout(1500);
    await expect(toaster.locator("> *")).toHaveCount(1);
  });

  test("Dismiss removes a toast and moves focus to the next one, then back", async ({ page }) => {
    const toaster = page.locator("dui-toaster");
    for (const name of ["Copy link", "Start export", "Sync now"]) await page.getByRole("button", { name }).click();
    await expect(toaster.locator("> *")).toHaveCount(3);
    const dismiss = toaster.getByRole("button", { name: "Dismiss" });
    await dismiss.first().focus();
    await page.keyboard.press("Enter");
    await expect(toaster.locator("> *")).toHaveCount(2);
    await expect(dismiss.first()).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(toaster.locator("> *")).toHaveCount(0);
    // Focus goes back to where it was before entering the toast region.
    await expect(page.getByRole("button", { name: "Sync now" })).toBeFocused();
  });

  test("server-rendered toasts get a Dismiss button when the component loads", async ({ page }) => {
    await page.evaluate(async () => {
      const region = document.createElement("dui-toaster");
      region.dataset.alert = "toasts";
      region.innerHTML = '<div data-alert="info"><p><strong>Info:</strong> Welcome back.</p></div>';
      document.body.append(region);
    });
    const region = page.locator("dui-toaster").last();
    await expect(region.getByRole("button", { name: "Dismiss" })).toHaveAccessibleDescription("Info: Welcome back.");
    await expect(region).toHaveAttribute("role", "status");
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("tabs fall back to headed sections and working in-page links", async ({ page }) => {
    await page.goto("examples/molecules/tabs.html");
    await expect(page.getByRole("tab")).toHaveCount(0);
    for (const name of ["Profile", "Security", "Notifications"]) {
      await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
    }
    const contents = page.getByRole("navigation", { name: "Account settings" });
    await expect(contents.getByRole("link")).toHaveCount(3);
    await contents.getByRole("link", { name: "Notifications" }).click();
    await expect(page).toHaveURL(/#tab-notifications$/);
    await expect(page.locator("#tab-notifications")).toBeInViewport();
  });

  test("tabs fallback marks the initial tab with aria-current, not aria-selected", async ({ page }) => {
    await page.goto("examples/molecules/tabs.html");
    const period = page.getByRole("navigation", { name: "Report period" });
    await expect(period.getByRole("link", { name: "Month" })).toHaveAttribute("aria-current", "true");
    await expect(page.locator("dui-tabs [aria-selected]")).toHaveCount(0);
  });

  test("toolbar buttons are each reachable with Tab", async ({ page }) => {
    await page.goto("examples/molecules/toolbar.html");
    const toolbar = page.getByRole("toolbar", { name: "Text formatting" });
    const buttons = toolbar.getByRole("button");
    await buttons.first().focus();
    for (let i = 1; i < (await buttons.count()); i++) {
      await page.keyboard.press("Tab");
      await expect(buttons.nth(i)).toBeFocused();
    }
  });

  test("menu button still opens its popover of plain buttons", async ({ page }) => {
    await page.goto("examples/molecules/menu-button.html");
    await page.getByRole("button", { name: "Actions" }).click();
    await expect(page.locator("#row-actions")).toBeVisible();
    await expect(page.getByRole("menu")).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Edit" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Duplicate" })).toBeFocused();
  });

  test("tooltip text is still the trigger's description", async ({ page }) => {
    await page.goto("examples/molecules/popover.html");
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveAccessibleDescription("Shortcut: Ctrl+S");
  });
});

test("tabs markup before the upgrade has no axe violations", async ({ page }) => {
  // Block the module so <dui-tabs> is never defined; axe still needs page script, so JavaScript stays on.
  await page.route("**/web-components/dui-tabs.js", (route) => route.abort());
  await page.goto("examples/molecules/tabs.html");
  await expect(page.getByRole("tab")).toHaveCount(0);
  expect(await page.evaluate(() => customElements.get("dui-tabs"))).toBeUndefined();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

/*
 * Rendered indicator contrast (WCAG 1.4.11): the selected tab bar, the current
 * nav bar and the current pagination box against what surrounds them, and the
 * focus ring on new surfaces, in light and dark.
 */
const contrastOf = ([a, b]) => {
  const ctx = /** @type {CanvasRenderingContext2D} */ (document.createElement("canvas").getContext("2d", { willReadFrequently: true }));
  const rgb = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  };
  const lum = (c) => {
    const [R, G, B] = rgb(c).map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };
  const [la, lb] = [lum(a), lum(b)];
  return Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100;
};

/** Background color of the nearest ancestor with an opaque one. */
const surfaceOf = (el) => {
  const ctx = /** @type {CanvasRenderingContext2D} */ (document.createElement("canvas").getContext("2d", { willReadFrequently: true }));
  const opaque = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[3] === 255;
  };
  let node = el.parentElement;
  while (node && !opaque(getComputedStyle(node).backgroundColor)) node = node.parentElement;
  return getComputedStyle(node ?? document.documentElement).backgroundColor;
};

for (const colorScheme of schemes) {
  test(`indicators and focus rings on molecules reach 3:1 (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await withoutMotion(page);
    const measure = async (locator, pick) => {
      const pair = await locator.evaluate(
        (el, [pickSource, surfaceSource]) => (0, eval)(`(${pickSource})`)(el, (0, eval)(`(${surfaceSource})`)),
        [pick.toString(), surfaceOf.toString()],
      );
      return page.evaluate(([source, p]) => (0, eval)(`(${source})`)(p), [contrastOf.toString(), pair]);
    };

    // Tabs, in both theming panels: the bar against the surface it sits on.
    await page.goto("examples/theming.html");
    for (const tab of await page.getByRole("tab", { selected: true }).all()) {
      expect(await measure(tab, (el, surface) => [getComputedStyle(el).borderBlockEndColor, surface(el)])).toBeGreaterThanOrEqual(3);
      await tab.focus();
      expect(await measure(tab, (el, surface) => [getComputedStyle(el).outlineColor, surface(el)])).toBeGreaterThanOrEqual(3);
    }
    // Card overlay focus ring against the panel.
    for (const link of await page.locator("[data-card~='link'] h3 a").all()) {
      await link.focus();
      expect(await measure(link, (el, surface) => [getComputedStyle(el, "::after").outlineColor, surface(el.closest("article"))])).toBeGreaterThanOrEqual(3);
    }

    // Nav: the current bar against its own tint and against the page surface; the focus ring on the tint.
    await page.goto("examples/molecules/nav.html");
    const current = page.locator("[data-nav] a[aria-current='page']").first();
    expect(await measure(current, (el) => [getComputedStyle(el).borderInlineStartColor, getComputedStyle(el).backgroundColor])).toBeGreaterThanOrEqual(3);
    expect(await measure(current, (el, surface) => [getComputedStyle(el).borderInlineStartColor, surface(el)])).toBeGreaterThanOrEqual(3);
    await current.focus();
    expect(await measure(current, (el) => [getComputedStyle(el).outlineColor, getComputedStyle(el).backgroundColor])).toBeGreaterThanOrEqual(3);

    // Pagination: the current box against the surface; its inner focus ring against its fill.
    await page.goto("examples/molecules/pagination.html");
    const currentPage = page.locator("[data-pagination] a[aria-current='page']").first();
    expect(await measure(currentPage, (el, surface) => [getComputedStyle(el).backgroundColor, surface(el)])).toBeGreaterThanOrEqual(3);
    await currentPage.focus();
    expect(await measure(currentPage, (el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor])).toBeGreaterThanOrEqual(3);
    expect(await currentPage.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("inset");

    // Toolbar: the focus ring on a pressed toggle's tint.
    await page.goto("examples/molecules/toolbar.html");
    const pressed = page.getByRole("button", { name: "Bold", pressed: true });
    await pressed.focus();
    expect(await measure(pressed, (el) => [getComputedStyle(el).outlineColor, getComputedStyle(el).backgroundColor])).toBeGreaterThanOrEqual(3);
  });
}

test("molecules in the forest panel re-theme from the token overrides alone", async ({ page }) => {
  await withoutMotion(page);
  await page.goto("examples/theming.html");
  const sample = () =>
    page.locator(".panel").evaluateAll((panels) =>
      panels.map((panel) => {
        const style = (selector, property) => getComputedStyle(/** @type {Element} */ (panel.querySelector(selector)))[property];
        return {
          breadcrumbLink: style("[data-breadcrumb] a", "color"),
          alert: style("[data-alert~='warning']", "backgroundColor"),
          tabBar: style("[role='tab'][aria-selected='true']", "borderBlockEndColor"),
          card: style("[data-card]", "backgroundColor"),
          cardLink: style("[data-card] h3 a", "color"),
          cardRadius: style("[data-card]", "borderTopLeftRadius"),
        };
      }),
    );
  const [defaultPanel, forestPanel] = await sample();
  for (const key of Object.keys(defaultPanel)) {
    expect(forestPanel[key], key).not.toBe(defaultPanel[key]);
  }
  await page.evaluate(() => {
    const sheet = /** @type {HTMLStyleElement} */ (document.getElementById("forest-theme")).sheet;
    if (sheet) sheet.disabled = true;
  });
  const [plainDefault, plainForest] = await sample();
  expect(plainForest).toEqual(plainDefault);
});

// Forced colors replace every border color, transparent included
// (https://www.w3.org/TR/css-color-adjust-1/#forced-colors-properties): an
// empty indicator bar must take the background color, or every item looks current.
test("in forced colors only the current nav link and the selected tab show an indicator bar", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "forced-colors emulation is Chromium-only in Playwright");
  await page.emulateMedia({ forcedColors: "active" });
  const system = (/** @type {string} */ name) =>
    page.evaluate((n) => {
      const p = document.createElement("p");
      p.style.color = n;
      document.body.append(p);
      const color = getComputedStyle(p).color;
      p.remove();
      return color;
    }, name);

  await page.goto("examples/molecules/nav.html");
  const canvas = await system("Canvas");
  const highlight = await system("Highlight");
  const sidebar = page.getByRole("navigation", { name: "Sidebar example" });
  const bars = await sidebar.locator("a").evaluateAll((links) => links.map((a) => ({ current: a.getAttribute("aria-current") === "page", color: getComputedStyle(a).borderInlineStartColor })));
  for (const bar of bars) expect(bar.color).toBe(bar.current ? highlight : canvas);
  const top = page.getByRole("navigation", { name: "Top bar example" });
  const tops = await top.locator(":scope > ul > li > a").evaluateAll((links) => links.map((a) => ({ current: !!a.getAttribute("aria-current"), color: getComputedStyle(a).borderBottomColor })));
  for (const bar of tops) expect(bar.color).toBe(bar.current ? highlight : canvas);

  await page.goto("examples/molecules/tabs.html");
  const canvasText = await system("CanvasText");
  const tabs = await page.locator('[role="tab"]').evaluateAll((all) => all.map((t) => ({ selected: t.getAttribute("aria-selected") === "true", color: getComputedStyle(t).borderBottomColor, width: getComputedStyle(t).borderBottomWidth })));
  expect(tabs.length).toBeGreaterThan(1);
  for (const t of tabs) expect(t.color).toBe(t.selected ? highlight : canvasText);
  expect(new Set(tabs.filter((t) => !t.selected).map((t) => t.width)).size).toBe(1);
  expect(tabs.find((t) => t.selected)?.width).not.toBe(tabs.find((t) => !t.selected)?.width);
});
