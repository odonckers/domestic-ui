// @ts-check
import { test, expect } from "@playwright/test";
import { schemes, withoutMotion } from "./helpers.js";

/*
 * Atom behavior through the accessibility APIs Playwright exposes
 * (getByRole filters, toBeDisabled, toBeChecked, toHaveAccessibleName,
 * toHaveAccessibleDescription), plus rendered focus-ring contrast and
 * scoped theming of atoms. Token-level contrast lives in tokens.spec.js.
 */

test.describe("buttons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("examples/atoms/button.html");
  });

  test("disabled buttons are disabled and leave the tab order", async ({ page }) => {
    for (const name of ["Delete", "Archive"]) {
      const button = page.getByRole("button", { name, disabled: true });
      await expect(button).toBeDisabled();
      await button.focus();
      await expect(button).not.toBeFocused();
    }
  });

  test("aria-disabled buttons are exposed as disabled but stay focusable", async ({ page }) => {
    const publish = page.getByRole("button", { name: "Publish", disabled: true });
    await expect(publish).toHaveAttribute("aria-disabled", "true");
    await expect(publish).toBeDisabled();
    await expect(publish).toHaveAccessibleDescription("Add a title before publishing.");
    await publish.focus();
    await expect(publish).toBeFocused();
    // Looks disabled: same opacity as a native disabled button.
    const opacity = (name) => page.getByRole("button", { name, disabled: true }).evaluate((el) => getComputedStyle(el).opacity);
    expect(await opacity("Publish")).toBe(await opacity("Delete"));
  });

  test("loading state changes the visible label and sets aria-busy", async ({ page }) => {
    const save = page.getByRole("button", { name: "Save changes" });
    await save.click();
    const busy = page.getByRole("button", { name: "Saving…", disabled: true });
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(busy).toBeFocused();
    await expect(page.getByRole("status")).toHaveText("Changes saved.");
    await expect(page.getByRole("button", { name: "Save changes", disabled: false })).not.toHaveAttribute("aria-busy");
  });

  test("link buttons keep link semantics", async ({ page }) => {
    for (const name of ["Create account", "Read the guide", "Skip for now"]) {
      const link = page.getByRole("link", { name });
      await expect(link).toHaveAttribute("href", /.+/);
      await expect(link).toHaveAttribute("data-button");
    }
  });

  test("primary buttons use system button colors in forced colors", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "forced-colors emulation is Chromium-only in Playwright");
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("examples/atoms/button.html");
    const colors = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement("span"));
      const system = (name) => {
        probe.style.color = name;
        return getComputedStyle(probe).color;
      };
      const face = system("ButtonFace");
      const text = system("ButtonText");
      const highlight = system("Highlight");
      probe.remove();
      const read = (selector) => {
        const style = getComputedStyle(document.querySelector(selector));
        return { bg: style.backgroundColor, fg: style.color };
      };
      return { face, text, highlight, submit: read('button[type="submit"]'), primary: read('[data-button~="primary"]') };
    });
    for (const button of [colors.submit, colors.primary]) {
      const face = button.bg === colors.face || button.bg === colors.highlight;
      const ink = button.fg === colors.text || button.fg === colors.highlight;
      expect(face, JSON.stringify(button)).toBe(true);
      expect(ink, JSON.stringify(button)).toBe(true);
    }
  });

  test("a submit button is primary by default and data-button overrides it", async ({ page }) => {
    const bg = (name) => page.getByRole("button", { name, exact: true, disabled: false }).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await bg("Publish")).not.toBe(await bg("Save draft"));
    expect(await bg("Save draft")).toBe(await bg("Secondary"));
    expect(await bg("Primary")).toBe(await bg("Default"));
  });

  test("sizes keep the target size: small 32px, default 36px, large 40px, all over 24px", async ({ page }) => {
    const height = (name) => page.getByRole("button", { name, exact: true }).evaluate((el) => el.getBoundingClientRect().height);
    expect(await height("Small")).toBeGreaterThanOrEqual(32);
    expect(await height("Default")).toBeGreaterThanOrEqual(36);
    expect(await height("Large")).toBeGreaterThanOrEqual(40);
  });

  test("a pressed button scales to 0.98, and not at all under reduced motion", async ({ page }) => {
    const pressed = async () => {
      const button = page.getByRole("button", { name: "Default", exact: true });
      // Read the end state, not the first frame of the transition.
      await button.evaluate((el) => el.style.setProperty("transition", "none"));
      await button.scrollIntoViewIfNeeded();
      const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (await button.boundingBox());
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const scale = await button.evaluate((el) => getComputedStyle(el).scale);
      await page.mouse.up();
      return scale;
    };
    expect(await pressed()).toBe("0.98");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await pressed()).toBe("1");
  });

  test("every variant shows a :focus-visible outline", async ({ page }) => {
    const targets = page.locator("main :is(button, a[data-button]):not(:disabled)");
    expect(await targets.count()).toBeGreaterThan(8);
    for (const target of await targets.all()) {
      await target.focus();
      const ring = await target.evaluate((el) => {
        const style = getComputedStyle(el);
        return { visible: el.matches(":focus-visible"), style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
      });
      expect(ring).toEqual({ visible: true, style: "solid", width: expect.any(Number) });
      expect(ring.width).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe("switch", () => {
  test("is exposed as a switch whose state toggles with click and Space", async ({ page }) => {
    await page.goto("examples/atoms/switch.html");
    const alerts = page.getByRole("switch", { name: "Email alerts" });
    await expect(alerts).not.toBeChecked();
    await alerts.click();
    await expect(page.getByRole("switch", { name: "Email alerts", checked: true })).toBeVisible();
    await alerts.focus();
    await page.keyboard.press("Space");
    await expect(alerts).not.toBeChecked();
    // Clicking the label text toggles too.
    await page.getByText("Email alerts", { exact: true }).click();
    await expect(alerts).toBeChecked();

    await expect(page.getByRole("switch", { name: "Weekly digest" })).toBeChecked();
    await expect(page.getByRole("switch", { name: "Beta features" })).toBeDisabled();
  });

  test("on and off differ by thumb position, not only by color", async ({ page }) => {
    await page.goto("examples/atoms/switch.html");
    const translate = (name) =>
      page.getByRole("switch", { name }).evaluate((el) => getComputedStyle(el, "::before").translate);
    expect(await translate("Email alerts")).not.toBe(await translate("Weekly digest"));
  });
});

test.describe("field", () => {
  test.beforeEach(async ({ page }) => {
    // No transitions, so computed colors are final as soon as the state changes.
    await withoutMotion(page);
    await page.goto("examples/atoms/field.html");
  });

  test("hints are the accessible description", async ({ page }) => {
    await expect(page.getByRole("textbox", { name: "Display name" })).toHaveAccessibleDescription("Shown next to your comments.");
  });

  test("invalid fields expose invalid and their error text as the description", async ({ page, browserName }) => {
    const email = page.getByRole("textbox", { name: "Email" });
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription(
      "We only use this to reply. Error: enter an email address like name@example.com.",
    );
    await expect(page.getByRole("group", { name: "Size" })).toHaveAccessibleDescription("Error: choose a size.");

    // The accessibility tree itself, through the Chrome DevTools Protocol, which
    // only Chromium offers. Other engines are covered by the attribute check above.
    if (browserName === "chromium") {
      const cdp = await page.context().newCDPSession(page);
      const { root } = await cdp.send("DOM.getDocument");
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#f-email" });
      const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
      const invalid = nodes[0].properties?.find((p) => p.name === "invalid");
      expect(invalid?.value.value).toBe("true");
    }
  });

  test("invalid controls change shape as well as color", async ({ page }) => {
    const width = (name) => page.getByRole("textbox", { name }).evaluate((el) => Number.parseFloat(getComputedStyle(el).borderInlineStartWidth));
    expect(await width("Email")).toBeGreaterThan(await width("Display name"));
  });

  test("native constraint errors get the invalid style after interaction (:user-invalid)", async ({ page }) => {
    const code = page.getByRole("textbox", { name: "Invite code" });
    const state = () =>
      code.evaluate((el) => ({ userInvalid: el.matches(":user-invalid"), border: getComputedStyle(el).borderInlineStartColor }));
    const before = await state();
    expect(before.userInvalid).toBe(false);
    await code.fill("abc");
    await code.blur();
    const after = await state();
    expect(after.userInvalid).toBe(true);
    expect(after.border).not.toBe(before.border);
    const invalidBorder = await page.getByRole("textbox", { name: "Email" }).evaluate((el) => getComputedStyle(el).borderInlineStartColor);
    expect(after.border).toBe(invalidBorder);
  });
});

/*
 * Focus ring contrast on rendered buttons (WCAG 1.4.11, 2.4.13).
 * The outer outline must reach 3:1 against the surface it sits on, and the
 * part of the indicator that touches the fill (the inner box-shadow ring if
 * there is one, else the outline) must reach 3:1 against the fill, at rest and
 * on hover, in both panels of theming.html (default and forest themes).
 */
const focusContrast = (el) => {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  };
  const luminance = ([r, g, b]) => {
    const [R, G, B] = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };
  const ratio = (a, b) => {
    const [la, lb] = [luminance(rgba(a)), luminance(rgba(b))];
    return Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100;
  };
  const opaque = (color) => rgba(color)[3] === 255;
  let node = el.parentElement;
  while (node && !opaque(getComputedStyle(node).backgroundColor)) node = node.parentElement;
  const surface = getComputedStyle(node ?? document.documentElement).backgroundColor;
  const style = getComputedStyle(el);
  const fill = opaque(style.backgroundColor) ? style.backgroundColor : surface;
  const inset = style.boxShadow.includes("inset") ? style.boxShadow.match(/(?:rgba?|oklab|oklch|color|lab|lch)\([^)]*\)/)?.[0] : null;
  return {
    label: el.textContent.trim(),
    focusVisible: el.matches(":focus-visible"),
    outlineOnSurface: ratio(style.outlineColor, surface),
    indicatorOnFill: ratio(inset ?? style.outlineColor, fill),
  };
};

for (const colorScheme of schemes) {
  test(`focus ring contrasts with every button fill and the surface (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await withoutMotion(page);
    await page.goto("examples/theming.html");
    const buttons = page.locator(".panel button");
    expect(await buttons.count()).toBe(6);
    for (const button of await buttons.all()) {
      for (const hover of [false, true]) {
        if (hover) await button.hover();
        await button.focus();
        const result = await button.evaluate(focusContrast);
        const where = `${result.label}${hover ? " (hover)" : ""}: ${JSON.stringify(result)}`;
        expect(result.focusVisible, where).toBe(true);
        expect(result.outlineOnSurface, where).toBeGreaterThanOrEqual(3);
        expect(result.indicatorOnFill, where).toBeGreaterThanOrEqual(3);
      }
    }
  });
}

test("atoms in the forest panel re-theme from the token overrides alone", async ({ page }) => {
  await withoutMotion(page);
  await page.goto("examples/theming.html");
  const sample = () =>
    page.locator(".panel").evaluateAll((panels) =>
      panels.map((panel) => {
        const style = (selector, property) => getComputedStyle(panel.querySelector(selector))[property];
        return {
          primary: style('button[type="submit"]', "backgroundColor"),
          quiet: style('[data-button~="quiet"]', "color"),
          switchOn: style('[role="switch"]:checked', "backgroundColor"),
          badgeAccent: style('[data-badge~="accent"]', "backgroundColor"),
          badgeSuccess: style('[data-badge~="success"]', "backgroundColor"),
          field: style("[data-field] input", "backgroundColor"),
        };
      }),
    );
  const [defaultPanel, forestPanel] = await sample();
  for (const key of Object.keys(defaultPanel)) {
    expect(forestPanel[key], key).not.toBe(defaultPanel[key]);
  }
  // Remove the token overrides: the panels match again, so nothing else differs.
  await page.evaluate(() => {
    const sheet = /** @type {HTMLStyleElement} */ (document.getElementById("forest-theme")).sheet;
    if (sheet) sheet.disabled = true;
  });
  const [plainDefault, plainForest] = await sample();
  expect(plainForest).toEqual(plainDefault);
});
