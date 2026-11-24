// @ts-check
import { test, expect } from "@playwright/test";
import { registerContrastTests } from "./contrast.js";

registerContrastTests({ name: "default theme", selector: ":root body" });
registerContrastTests({ name: "forest theme", selector: '[data-theme="forest"]' });

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
      link: getComputedStyle(panel.querySelector("a")).color,
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
