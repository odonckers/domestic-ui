// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { examples, schemes, blockExternalRequests, WCAG_TAGS, summarize } from "./helpers.js";

/** @param {import("@playwright/test").Page} page */
const axe = (page) => new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

/**
 * Wait for running CSS transitions and animations (dialog fades, drawer slides)
 * to finish, so axe measures final colors, not a frame mid-fade.
 * @param {import("@playwright/test").Page} page
 */
const settle = (page) =>
  page.evaluate(async () => {
    // Two frames first: under CI load WebKit can report no animations before an
    // @starting-style transition has started, and axe then reads mid-fade colors.
    for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})));
  });

for (const path of examples) {
  test.describe(path, () => {
    for (const colorScheme of schemes) {
      test(`has no axe violations (${colorScheme})`, async ({ page, baseURL }) => {
        const external = await blockExternalRequests(page, baseURL ?? "");
        await page.emulateMedia({ colorScheme });
        await page.goto(path, { waitUntil: "networkidle" });

        const { violations } = await axe(page);
        expect(violations, summarize(violations)).toEqual([]);

        // Open dialogs and details too, so their contents are checked.
        for (const opener of await page.locator('button[command="show-modal"]').all()) {
          await opener.click();
          const dialog = page.locator("dialog[open]");
          await expect(dialog).toBeVisible();
          await settle(page);
          const open = await axe(page);
          expect(open.violations, summarize(open.violations)).toEqual([]);
          await page.keyboard.press("Escape");
          await expect(dialog).toHaveCount(0);
          await expect(opener).toBeFocused();
        }

        // Popovers and menus: open each from its button, check, close.
        for (const opener of await page.locator("button[popovertarget]:not([popovertargetaction='hide'])").all()) {
          const id = await opener.getAttribute("popovertarget");
          const popover = page.locator(`[id="${id}"]`);
          await opener.click();
          await expect(popover).toBeVisible();
          await settle(page);
          const open = await axe(page);
          expect(open.violations, `#${id}\n${summarize(open.violations)}`).toEqual([]);
          await popover.evaluate((el) => el.hidePopover());
          await expect(popover).toBeHidden();
        }

        // Comboboxes: open each list with an option active, check, close.
        for (const combobox of await page.locator("dui-combobox [role='combobox']").all()) {
          await combobox.focus();
          await page.keyboard.press("Alt+ArrowDown");
          if ((await combobox.getAttribute("aria-expanded")) !== "true") continue; // no options yet (loaded by the page)
          await page.keyboard.press("ArrowDown");
          await settle(page);
          const open = await axe(page);
          expect(open.violations, `#${await combobox.getAttribute("id")}\n${summarize(open.violations)}`).toEqual([]);
          await page.keyboard.press("Escape");
          await expect(combobox).toHaveAttribute("aria-expanded", "false");
        }

        // Tabs: select every tab once (the selected panel is the only one shown).
        for (const tab of await page.getByRole("tab").all()) {
          await tab.click();
          await expect(tab).toHaveAttribute("aria-selected", "true");
          const selected = await axe(page);
          expect(selected.violations, summarize(selected.violations)).toEqual([]);
        }

        // Tooltips show on focus.
        for (const trigger of await page.locator("dui-tooltip [aria-describedby]").all()) {
          await trigger.focus();
          await expect(page.locator("[role='tooltip']:popover-open")).toHaveCount(1);
          await settle(page);
          const shown = await axe(page);
          expect(shown.violations, summarize(shown.violations)).toEqual([]);
          await trigger.blur();
        }

        // Toasts and live regions: fill them, then check.
        const fillers = page.locator("[data-toast], [data-announce]");
        if (await fillers.count()) {
          for (const button of await fillers.all()) await button.click();
          await expect(page.locator("dui-toaster > *")).toHaveCount(await page.locator("[data-toast]").count());
          await settle(page);
          const filled = await axe(page);
          expect(filled.violations, summarize(filled.violations)).toEqual([]);
        }

        // App shell drawers: on a narrow screen each sidebar toggle opens a modal drawer; check it open, then close it.
        const sidebarIds = await page.locator("dui-app-shell > :is(nav, aside)[id]").evaluateAll((all) => all.map((el) => el.id));
        const toggles = page.locator(sidebarIds.map((id) => `dui-app-shell button[aria-controls="${id}"]`).join(", ") || "dui-app-shell > nothing");
        if (await toggles.count()) {
          const size = page.viewportSize();
          await page.setViewportSize({ width: 375, height: 812 });
          for (const toggle of await toggles.all()) {
            await expect(toggle).toHaveAttribute("aria-expanded", "false");
            await toggle.click();
            await expect(page.locator("dialog[open]")).toHaveCount(1);
            await settle(page);
            const open = await axe(page);
            expect(open.violations, `${await toggle.getAttribute("aria-controls")} drawer\n${summarize(open.violations)}`).toEqual([]);
            await page.keyboard.press("Escape");
            await expect(page.locator("dialog[open]")).toHaveCount(0);
            await expect(toggle).toBeFocused();
          }
          if (size) await page.setViewportSize(size);
        }

        // Every details element open at once. Drop name first, or exclusive groups would close all but one.
        await page.locator("details").evaluateAll((all) =>
          all.forEach((d) => {
            d.removeAttribute("name");
            d.setAttribute("open", "");
          }),
        );
        await settle(page);
        const expanded = await axe(page);
        expect(expanded.violations, summarize(expanded.violations)).toEqual([]);

        expect(external, "external network requests").toEqual([]);
      });
    }

    test("renders differently in light and dark", async ({ page }) => {
      const sample = async (colorScheme) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        return page.evaluate(() => {
          const body = getComputedStyle(document.body);
          const root = getComputedStyle(document.documentElement);
          return { background: root.backgroundColor, color: body.color };
        });
      };
      const light = await sample("light");
      const dark = await sample("dark");
      expect(light.background).not.toEqual(dark.background);
      expect(light.color).not.toEqual(dark.color);
    });
  });
}

test("data-color-scheme forces a scheme regardless of the user preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("examples/base.html");
  const light = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  await page.evaluate(() => document.documentElement.setAttribute("data-color-scheme", "dark"));
  const forcedDark = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(forcedDark).not.toEqual(light);

  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => document.documentElement.setAttribute("data-color-scheme", "light"));
  const forcedLight = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(forcedLight).toEqual(light);
});
