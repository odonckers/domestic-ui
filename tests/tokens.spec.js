// @ts-check
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { registerContrastTests } from "./contrast.js";

registerContrastTests({ name: "default theme", selector: ":root body" });
registerContrastTests({ name: "forest theme", selector: '[data-theme="forest"]' });
for (const theme of ["calm", "soft", "compact"]) registerContrastTests({ name: `${theme} theme`, selector: `[data-theme="${theme}"]`, pagePath: "examples/themes.html" });
// The contrast knob (#73) at every documented value: 0.8, 1.5 by attribute and 1.5 by prefers-contrast.
registerContrastTests({ name: "contrast 0.8", selector: '[aria-labelledby="contrast-08-title"]' });
registerContrastTests({ name: 'data-contrast="more"', selector: '[data-contrast="more"]' });
registerContrastTests({ name: "prefers-contrast: more", selector: ":root body", contrast: "more" });
registerContrastTests({ name: "forest theme under prefers-contrast: more", selector: '[data-theme="forest"]', contrast: "more" });

/**
 * Emulate a Display P3 screen (#74). Playwright's emulateMedia has no color-gamut, so this uses the
 * Chrome DevTools Protocol, which only Chromium has.
 * @param {{ page: import("@playwright/test").Page, browserName: string }} args
 */
const emulateP3 = async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "color-gamut is emulated through the Chrome DevTools Protocol");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "color-gamut", value: "p3" }] });
};
registerContrastTests({ name: "default theme on a Display P3 screen", selector: ":root body", setup: emulateP3 });
registerContrastTests({ name: "forest theme on a Display P3 screen", selector: '[data-theme="forest"]', setup: emulateP3 });

test("a theme that sets only the accent re-derives link, hover and surface; primary recolors submit", async ({ page }) => {
  await page.goto("examples/theming.html");
  const result = await page.evaluate(() => {
    const colorOf = (el, token) => {
      el.style.color = `var(${token})`;
      return getComputedStyle(el).color;
    };
    const probe = (accent, primary) => {
      const scope = document.createElement("div");
      scope.dataset.theme = "probe";
      if (accent) scope.style.setProperty("--dui-color-accent", accent);
      if (primary) scope.style.setProperty("--dui-color-primary", primary);
      scope.innerHTML = `<div><a href="#x">link</a><button type="submit">Go</button></div>`;
      document.body.append(scope);
      const swatch = document.createElement("span");
      scope.append(swatch);
      const out = {
        link: getComputedStyle(scope.querySelector("a")).color,
        submit: getComputedStyle(scope.querySelector("button")).backgroundColor,
        hover: colorOf(swatch, "--dui-color-accent-hover"),
        surface: colorOf(swatch, "--dui-color-accent-surface"),
        text: colorOf(swatch, "--dui-color-accent-text"),
        focus: colorOf(swatch, "--dui-color-focus"),
      };
      scope.remove();
      return out;
    };
    const klass = document.createElement("div");
    klass.className = "card theme-probe";
    klass.style.setProperty("--dui-color-accent", "oklch(40% 0.1 150)");
    klass.innerHTML = `<a href="#x">link</a>`;
    document.body.append(klass);
    const classLink = getComputedStyle(klass.querySelector("a")).color;
    klass.remove();
    const direct = document.createElement("section");
    direct.dataset.theme = "probe";
    direct.style.setProperty("--dui-color-link", "rgb(4, 5, 6)");
    direct.innerHTML = `<div><p><a href="#y">nested link</a></p></div>`;
    document.body.append(direct);
    const nested = getComputedStyle(direct.querySelector("a")).color;
    direct.remove();
    const base = probe(null, null);
    return {
      base,
      accent: probe("oklch(40% 0.1 150)", null),
      other: probe("oklch(45% 0.12 30)", null),
      primary: probe(null, "oklch(30% 0.05 150)"),
      classLink,
      nested,
    };
  });
  for (const key of ["link", "hover", "surface", "text", "focus"]) {
    expect(result.accent[key], key).not.toBe(result.base[key]);
  }
  // The link follows the accent text, and a different accent produces a different link.
  expect(result.accent.link).toBe(result.accent.text);
  expect(result.accent.link).not.toBe(result.other.link);
  // The submit button stays on the primary tokens until those are set.
  expect(result.accent.submit).toBe(result.base.submit);
  expect(result.primary.submit).not.toBe(result.base.submit);
  expect(result.primary.link).toBe(result.base.link);
  // A theme-* class is a theme scope too, and a direct link override still reaches nested elements.
  expect(result.classLink).toBe(result.accent.link);
  expect(result.nested).toBe("rgb(4, 5, 6)");
});

test("forest panel actually differs from the default panel", async ({ page }) => {
  await page.goto("examples/theming.html");
  const [defaultPanel, forestPanel] = await page.locator(".panel").evaluateAll((panels) =>
    panels.map((panel) => ({
      background: getComputedStyle(panel).backgroundColor,
      link: getComputedStyle(panel.querySelector(":scope > p a")).color,
      heading: getComputedStyle(panel.querySelector("h2")).fontFamily,
      primary: getComputedStyle(panel.querySelector('button[type="submit"]')).backgroundColor,
    })),
  );
  expect(forestPanel.background).not.toEqual(defaultPanel.background);
  expect(forestPanel.link).not.toEqual(defaultPanel.link);
  expect(forestPanel.heading).not.toEqual(defaultPanel.heading);
  expect(forestPanel.primary).not.toEqual(defaultPanel.primary);
});

test("reduced motion keeps color transitions and stops movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("examples/base.html");
  const { durations, movement } = await page.evaluate(() => {
    const style = getComputedStyle(/** @type {Element} */ (document.querySelector("button")));
    const names = style.transitionProperty.split(",").map((p) => p.trim());
    const times = style.transitionDuration.split(",").map((d) => Number.parseFloat(d));
    return { durations: Object.fromEntries(names.map((n, i) => [n, times[i]])), movement: getComputedStyle(document.documentElement).getPropertyValue("--dui-motion-movement").trim() };
  });
  expect(durations["background-color"]).toBeGreaterThan(0);
  expect(durations["border-color"]).toBeGreaterThan(0);
  expect(durations.scale).toBe(0);
  expect(Number(movement)).toBe(0);
});

test.describe("prebuilt themes (css/themes/)", () => {
  test("css/domestic.css imports no theme file", () => {
    const entry = readFileSync(new URL("../css/domestic.css", import.meta.url), "utf8");
    expect(entry).not.toMatch(/themes\//);
  });

  test("each theme changes its tokens only inside its scope, and scopes nest", async ({ page }) => {
    await page.goto("examples/themes.html");
    const read = await page.evaluate(() => {
      const probe = (/** @type {Element} */ el) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Probe";
        el.append(button);
        const cs = getComputedStyle(button);
        const out = { radius: cs.borderTopLeftRadius, height: button.getBoundingClientRect().height };
        button.remove();
        return out;
      };
      const soft = /** @type {Element} */ (document.querySelector('[data-theme="soft"]'));
      const nested = document.createElement("div");
      nested.setAttribute("data-theme", "compact");
      soft.append(nested);
      const result = { root: probe(document.body), soft: probe(soft), nested: probe(nested), compact: probe(/** @type {Element} */ (document.querySelector('[data-theme="compact"]'))) };
      nested.remove();
      return result;
    });
    expect(read.root.radius).toBe("8px");
    expect(read.soft.radius).toBe("12px");
    expect(read.compact.radius).toBe("2px");
    expect(read.nested.radius, "compact inside soft").toBe("2px");
    expect(read.compact.height).toBeCloseTo(32, 0);
    expect(read.soft.height).toBeGreaterThan(read.root.height);
  });

  test.describe("compact on a coarse pointer", () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    test("controls stay 44px", async ({ page, browserName }) => {
      test.skip(browserName === "firefox", "Firefox has no isMobile emulation");
      await page.goto("examples/themes.html");
      const height = await page.locator('[data-theme="compact"] button[type="submit"]').evaluate((el) => el.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(44 - 0.5);
    });
  });
});

test.describe("concentric nested radius (--dui-radius-nested)", () => {
  // Each pair: a rounded container with small padding and the item inside it.
  const PROBE = `
    <div data-probe="menu"><dui-menu><div popover data-popover data-probe-outer><button type="button" data-probe-inner>Item</button></div></dui-menu></div>
    <div data-probe="listbox"><dui-combobox><input role="combobox" aria-label="Probe" aria-expanded="false" aria-controls="probe-list"><ul role="listbox" id="probe-list" data-probe-outer><li role="option" aria-selected="false" data-probe-inner>Item</li></ul></dui-combobox></div>
    <nav data-nav="horizontal" aria-label="Probe" data-probe="dropdown"><ul><li><details open><summary>Group</summary><ul data-probe-outer><li><a href="#x" data-probe-inner>Item</a></li></ul></details></li></ul></nav>`;

  for (const [scale, slug] of [["0", "0"], ["1", "1"], ["1.5", "15"]]) {
    test(`at --dui-radius-scale ${scale} each item's radius is the container's radius less its padding, never below 0`, async ({ page }) => {
      await page.goto("examples/theming.html");
      const panel = page.locator(`[aria-labelledby="radius-${slug}-title"]`);
      await panel.evaluate((el, html) => el.insertAdjacentHTML("beforeend", html), PROBE);
      // The real menu in the example, opened.
      await panel.getByRole("button", { name: "Menu" }).click();
      const pairs = await panel.evaluate((el) => {
        const px = (v) => parseFloat(v) || 0;
        const read = (outer, inner) => {
          const o = getComputedStyle(outer);
          return { outer: px(o.borderTopLeftRadius), pad: px(o.paddingTop), inner: px(getComputedStyle(inner).borderTopLeftRadius) };
        };
        const menu = el.querySelector("dui-menu > [popover]:popover-open");
        const out = { "example menu": read(menu, menu.querySelector("button")) };
        for (const probe of el.querySelectorAll("[data-probe]")) out[probe.dataset.probe] = read(probe.querySelector("[data-probe-outer]"), probe.querySelector("[data-probe-inner]"));
        return out;
      });
      for (const [name, { outer, pad, inner }] of Object.entries(pairs)) {
        expect(pad, `${name}: padding`).toBeGreaterThan(0);
        expect(inner, `${name} at scale ${scale}`).toBeCloseTo(Math.max(0, outer - pad), 1);
        if (scale === "0") expect([outer, inner], `${name}: square at scale 0`).toEqual([0, 0]);
      }
    });
  }
});

test.describe("contrast knob (--dui-contrast)", () => {
  /** Muted text, hairline alpha and tint amount inside one element, as computed there. */
  const read = (el) => {
    const probe = document.createElement("div");
    probe.style.cssText = "color: var(--dui-color-text-muted); border: 1px solid var(--dui-color-border); outline: 1px solid var(--dui-color-accent-surface)";
    el.append(probe);
    const cs = getComputedStyle(probe);
    const knob = getComputedStyle(el).getPropertyValue("--dui-contrast").trim();
    // Paint each on a canvas to compare what is drawn.
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const x = /** @type {CanvasRenderingContext2D} */ (c.getContext("2d", { willReadFrequently: true }));
    const px = (color) => {
      x.clearRect(0, 0, 1, 1);
      x.fillStyle = color;
      x.fillRect(0, 0, 1, 1);
      return [...x.getImageData(0, 0, 1, 1).data];
    };
    probe.style.backgroundColor = "var(--dui-color-text)";
    const text = px(getComputedStyle(probe).backgroundColor);
    probe.style.backgroundColor = "var(--dui-color-surface)";
    const surface = px(getComputedStyle(probe).backgroundColor);
    const tinted = px(cs.outlineColor);
    // How far the accent tint is from the plain surface.
    const tint = Math.hypot(tinted[0] - surface[0], tinted[1] - surface[1], tinted[2] - surface[2]);
    const out = { knob, tint, muted: px(cs.color), text, border: px(cs.borderTopColor) };
    probe.remove();
    return out;
  };
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  for (const colorScheme of ["light", "dark"]) {
    test(`data-contrast="more" gives stronger muted text, hairlines and tints than the default (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("examples/theming.html");
      const base = await page.locator('[aria-labelledby="contrast-1-title"]').evaluate(read);
      const more = await page.locator('[data-contrast="more"]').evaluate(read);
      expect(base.knob).toBe("1");
      expect(more.knob).toBe("1.5");
      expect(distance(more.muted, more.text), "muted text is closer to the text color").toBeLessThan(distance(base.muted, base.text));
      expect(more.border[3], "hairline alpha").toBeGreaterThan(base.border[3]);
      expect(more.tint, "tint strength").toBeGreaterThan(base.tint);
    });
  }

  test("prefers-contrast: more applies the high value; the default leaves it at 1", async ({ page }) => {
    await page.goto("examples/theming.html");
    const knob = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--dui-contrast").trim());
    expect(await knob()).toBe("1");
    await page.emulateMedia({ contrast: "more" });
    await page.reload();
    test.skip(!(await page.evaluate(() => matchMedia("(prefers-contrast: more)").matches)), "this browser build does not emulate prefers-contrast");
    expect(await knob()).toBe("1.5");
    // A theme scope below re-derives its muted text from the inherited knob.
    const forest = await page.locator('[data-theme="forest"]').first().evaluate(read);
    expect(forest.knob).toBe("1.5");
  });

  test("below 1 muted text does not move: it stays at the default color", async ({ page }) => {
    await page.goto("examples/theming.html");
    const base = await page.locator('[aria-labelledby="contrast-1-title"]').evaluate(read);
    const soft = await page.locator('[aria-labelledby="contrast-08-title"]').evaluate(read);
    expect(soft.muted).toEqual(base.muted);
    expect(soft.border[3]).toBeLessThan(base.border[3]);
  });
});

test.describe("Display P3 accent and status solids", () => {
  const P3 = {
    "--dui-color-indigo-9": "oklch(0.53 0.23 272)",
    "--dui-color-indigo-dark-10": "oklch(0.64 0.162 272)",
    "--dui-color-red-9": "oklch(0.55 0.214 27)",
    "--dui-color-green-dark-9": "oklch(0.68 0.195 150)",
  };
  /** The accent as computed, and the listed primitives resolved through a probe. */
  const read = (names) => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const out = Object.fromEntries(
      names.map((n) => {
        probe.style.color = `var(${n})`;
        return [n, getComputedStyle(probe).color];
      }),
    );
    probe.style.color = "var(--dui-color-accent)";
    out.accent = getComputedStyle(probe).color;
    out.p3 = String(matchMedia("(color-gamut: p3)").matches);
    probe.remove();
    return out;
  };

  test("on an sRGB screen the solids keep their sRGB values", async ({ page }) => {
    await page.goto("examples/theming.html");
    const got = await page.evaluate(read, Object.keys(P3));
    test.skip(got.p3 === "true", "this runner reports a P3 screen");
    expect(got["--dui-color-indigo-9"]).toBe("oklch(0.53 0.215 272)");
    expect(got.accent).toBe("oklch(0.53 0.215 272)");
  });

  test("with color-gamut: p3 the solids resolve to the P3 values, at the same lightness and hue", async ({ page, browserName }) => {
    await emulateP3({ page, browserName });
    await page.goto("examples/theming.html");
    const got = await page.evaluate(read, Object.keys(P3));
    expect(got.p3).toBe("true");
    for (const [name, value] of Object.entries(P3)) expect(got[name], name).toBe(value);
    expect(got.accent).toBe(P3["--dui-color-indigo-9"]);
  });
});
