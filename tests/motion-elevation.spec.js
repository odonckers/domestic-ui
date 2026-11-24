// @ts-check
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { examples, schemes, withoutMotion } from "./helpers.js";

/*
 * Motion and elevation tokens (PRINCIPLES.md, "Motion" and "Elevation").
 * - data-motion="none": nothing transitions or animates, on any example, in any open state.
 * - Reduced motion (the media query or data-motion="reduced"): no movement transitions, fades stay.
 *   WCAG 2.3.3: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
 * - --dui-motion-scale multiplies durations on a descendant scope.
 * - Elevation: borders in forced colors, the deprecated alias, and the dark-scheme surface steps.
 * Token contrast on every elevation surface is in tokens.spec.js; axe, html-validate and the
 * small-screen checks pick up examples/motion.html and examples/elevation.html automatically.
 */

/** Properties that move or resize a box: none may transition under reduced motion. */
const MOVEMENT = ["all", "transform", "translate", "scale", "rotate"];

/**
 * Every element (and its ::before, ::after, and ::backdrop when open) whose computed
 * transition or animation duration is not 0s. Runs in the page.
 * @param {string} [scopeSelector] only elements inside this one (default: the whole document)
 */
const moving = (scopeSelector) => {
  const zero = (/** @type {string} */ value) =>
    value === "" || value.split(",").every((d) => d.trim() === "auto" || Number.parseFloat(d) === 0);
  const describe = (/** @type {Element} */ el) => `${el.localName}${el.id ? `#${el.id}` : ""}${el.getAttribute("data-dialog") !== null ? `[data-dialog="${el.getAttribute("data-dialog")}"]` : ""}`;
  const scope = scopeSelector ? document.querySelector(scopeSelector) : document.documentElement;
  if (!scope) throw new Error(`No element matches ${scopeSelector}`);
  const bad = [];
  for (const el of [scope, ...scope.querySelectorAll("*")]) {
    const pseudos = ["", "::before", "::after"];
    if (el.matches("dialog[open], [popover]:popover-open")) pseudos.push("::backdrop");
    for (const pseudo of pseudos) {
      const style = getComputedStyle(el, pseudo || null);
      if (!zero(style.transitionDuration) || !zero(style.animationDuration)) {
        bad.push(`${describe(el)}${pseudo}: transition ${style.transitionDuration}, animation ${style.animationDuration}`);
      }
    }
  }
  return bad;
};

/**
 * Elements with a movement property in transition-property and a non-zero duration for it.
 * Runs in the page.
 * @param {string[]} movement
 */
const movingTransforms = (movement) => {
  const bad = [];
  for (const el of document.querySelectorAll("*")) {
    for (const pseudo of ["", "::before", "::after"]) {
      const style = getComputedStyle(el, pseudo || null);
      const properties = style.transitionProperty.split(",").map((p) => p.trim());
      const durations = style.transitionDuration.split(",").map((d) => Number.parseFloat(d));
      properties.forEach((property, i) => {
        const duration = durations[i % durations.length];
        if (movement.includes(property) && duration > 0) bad.push(`${el.localName}${el.id ? `#${el.id}` : ""}${pseudo}: ${property} ${duration}s`);
      });
    }
  }
  return bad;
};

/**
 * The duration of one property's transition on an element, in seconds (0 if it does not transition).
 * Runs in the page.
 * @param {Element} el
 * @param {string} property
 */
const durationOf = (el, property) => {
  const style = getComputedStyle(el);
  const properties = style.transitionProperty.split(",").map((p) => p.trim());
  const durations = style.transitionDuration.split(",").map((d) => Number.parseFloat(d));
  const i = properties.indexOf(property);
  return i < 0 ? 0 : durations[i % durations.length];
};

test("the motion and elevation examples are picked up by every per-page check", () => {
  expect(examples).toContain("examples/motion.html");
  expect(examples).toContain("examples/elevation.html");
});

test.describe('data-motion="none"', () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
  });

  for (const path of examples) {
    test(`${path}: every duration is 0s, with every component open`, async ({ page }) => {
      await page.goto(path);
      const check = async (/** @type {string} */ state) => {
        const bad = await page.evaluate(moving);
        expect(bad, `${state}:\n  ${bad.join("\n  ")}`).toEqual([]);
      };
      await check("on load");

      for (const opener of await page.locator('button[command="show-modal"]').all()) {
        await opener.click();
        await expect(page.locator("dialog[open]")).toHaveCount(1);
        await check(`dialog from "${await opener.textContent()}"`);
        await page.keyboard.press("Escape");
        await expect(page.locator("dialog[open]")).toHaveCount(0);
      }

      for (const opener of await page.locator("[data-show-dialog]").all()) {
        await opener.click();
        await check("non-modal dialog");
        await page.keyboard.press("Escape");
      }

      for (const opener of await page.locator("button[popovertarget]:not([popovertargetaction='hide'])").all()) {
        const id = await opener.getAttribute("popovertarget");
        const popover = page.locator(`[id="${id}"]`);
        await opener.click();
        await expect(popover).toBeVisible();
        await check(`popover #${id}`);
        await popover.evaluate((el) => /** @type {HTMLElement} */ (el).hidePopover());
      }

      for (const combobox of await page.locator("dui-combobox [role='combobox']").all()) {
        await combobox.focus();
        await page.keyboard.press("Alt+ArrowDown");
        if ((await combobox.getAttribute("aria-expanded")) !== "true") continue; // no options yet (loaded by the page)
        await check(`combobox #${await combobox.getAttribute("id")}`);
        await page.keyboard.press("Escape");
      }

      for (const trigger of await page.locator("dui-tooltip [aria-describedby]").all()) {
        await trigger.focus();
        await expect(page.locator("[role='tooltip']:popover-open")).toHaveCount(1);
        await check("tooltip");
        await trigger.blur();
      }

      const fillers = page.locator("[data-toast], [data-announce]");
      if (await fillers.count()) {
        for (const button of await fillers.all()) await button.click();
        await check("toasts and live regions");
      }

      await page.locator("details").evaluateAll((all) =>
        all.forEach((d) => {
          d.removeAttribute("name");
          d.setAttribute("open", "");
        }),
      );
      await check("every details open");
    });
  }
});

test('data-motion="none" on a wrapper turns off motion inside it, open drawer and popover included', async ({ page }) => {
  await page.goto("examples/motion.html");
  const scope = '[data-motion="none"]';
  expect(await page.evaluate(moving, scope)).toEqual([]);
  await page.locator(scope).getByRole("button", { name: "Drawer" }).click();
  await expect(page.locator("#none-drawer")).toBeVisible();
  expect(await page.evaluate(moving, scope)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.locator(scope).getByRole("button", { name: "Popover" }).click();
  await expect(page.locator("#none-popover")).toBeVisible();
  expect(await page.evaluate(moving, scope)).toEqual([]);
  // Outside the wrapper, motion is untouched.
  expect(await page.locator("#slide-drawer").evaluate(durationOf, "opacity")).toBeGreaterThan(0);
});

const reducedModes = [
  {
    name: "prefers-reduced-motion: reduce",
    setup: async (/** @type {import("@playwright/test").Page} */ page) => page.emulateMedia({ reducedMotion: "reduce" }),
  },
  {
    name: 'data-motion="reduced" (no media query)',
    setup: async (/** @type {import("@playwright/test").Page} */ page) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.addInitScript(() => {
        const set = () => document.documentElement.setAttribute("data-motion", "reduced");
        if (document.documentElement) set();
        else
          new MutationObserver((_, observer) => {
            if (!document.documentElement) return;
            set();
            observer.disconnect();
          }).observe(document, { childList: true });
      });
    },
  },
];

for (const mode of reducedModes) {
  test.describe(`reduced motion: ${mode.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await mode.setup(page);
    });

    for (const path of examples) {
      test(`${path}: no transform, translate, scale or rotate transitions`, async ({ page }) => {
        await page.goto(path);
        const bad = await page.evaluate(movingTransforms, MOVEMENT);
        expect(bad, bad.join("\n")).toEqual([]);
      });
    }

    test("faded components keep their opacity transition and lose their movement", async ({ page }) => {
      await page.goto("examples/motion.html");
      for (const id of ["fade-dialog", "slide-drawer", "scale-popover", "scale-menu"]) {
        const el = page.locator(`#${id}`);
        expect(await el.evaluate(durationOf, "opacity"), `${id} opacity`).toBeGreaterThan(0);
        for (const property of ["translate", "scale"]) expect(await el.evaluate(durationOf, property), `${id} ${property}`).toBe(0);
      }
      // The drawer fades in place: open, it sits at its edge with no offset left to travel.
      await page.getByRole("button", { name: "Open drawer" }).click();
      await expect(page.locator("#slide-drawer")).toBeVisible();
      expect(await page.locator("#slide-drawer").evaluate((el) => getComputedStyle(el).translate)).toMatch(/^(none|0px( 0px)?)$/);
      await page.keyboard.press("Escape");

      // A new toast fades in without lifting.
      await page.locator("[data-toast]").click();
      const toast = page.locator("dui-toaster > *").first();
      await expect(toast).toBeVisible();
      expect(await toast.evaluate(durationOf, "opacity")).toBeGreaterThan(0);
      expect(await toast.evaluate(durationOf, "translate")).toBe(0);

      // Color changes stay.
      expect(await page.getByRole("button", { name: "Hover me" }).first().evaluate(durationOf, "background-color")).toBeGreaterThan(0);
      expect(await page.getByRole("switch").first().evaluate(durationOf, "background-color")).toBeGreaterThan(0);
    });
  });
}

test("with motion, the drawer slides, the popover zooms and the switch thumb moves", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("examples/motion.html");
  expect(await page.locator("#slide-drawer").evaluate(durationOf, "translate")).toBeGreaterThan(0);
  expect(await page.locator("#scale-popover").evaluate(durationOf, "scale")).toBeGreaterThan(0);
  const thumb = await page
    .getByRole("switch")
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el, "::before");
      return { property: style.transitionProperty, duration: Number.parseFloat(style.transitionDuration) };
    });
  expect(thumb.property).toBe("translate");
  expect(thumb.duration).toBeGreaterThan(0);
});

test("--dui-motion-scale: 2 doubles transition durations on a descendant scope", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("examples/molecules/dialog.html");
  const result = await page.evaluate((source) => {
    const durationOf = (0, eval)(`(${source})`);
    const make = (/** @type {Record<string, string>} */ attrs) => {
      const scope = document.createElement("div");
      Object.entries(attrs).forEach(([k, v]) => scope.setAttribute(k, v));
      scope.style.setProperty("--dui-motion-scale", "2");
      scope.innerHTML = `<button type="button">Go</button><dialog data-dialog="drawer end" aria-label="Probe"></dialog><div popover data-popover>Probe</div>`;
      document.body.append(scope);
      const [button, drawer, popover] = scope.children;
      const out = {
        button: durationOf(button, "background-color"),
        drawer: durationOf(drawer, "opacity"),
        popover: durationOf(popover, "opacity"),
      };
      scope.remove();
      return out;
    };
    const plain = {
      button: durationOf(document.querySelector("main button"), "background-color"),
      drawer: durationOf(document.querySelector("#filters-drawer"), "opacity"),
    };
    return { plain, motion: make({ "data-motion": "" }), theme: make({ "data-theme": "probe" }) };
  }, durationOf.toString());
  expect(result.plain.button).toBeGreaterThan(0);
  for (const scoped of [result.motion, result.theme]) {
    expect(scoped.button).toBeCloseTo(result.plain.button * 2, 5);
    expect(scoped.drawer).toBeCloseTo(result.plain.drawer * 2, 5);
  }
  // The popover's duration is the button's (both --dui-motion-duration-fast).
  expect(result.motion.popover).toBeCloseTo(result.motion.button, 5);
});

test("deprecated aliases resolve to their replacements", async ({ page }) => {
  await page.goto("examples/elevation.html");
  const result = await page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const read = (/** @type {string} */ property, /** @type {string} */ value) => {
      probe.style.setProperty(property, value);
      const out = getComputedStyle(probe).getPropertyValue(property);
      probe.style.removeProperty(property);
      return out;
    };
    const out = {
      shadowRaised: read("box-shadow", "var(--dui-shadow-raised)"),
      level1: read("box-shadow", "var(--dui-elevation-1)"),
      raised: read("box-shadow", "var(--dui-elevation-raised)"),
      fast: read("transition-duration", "var(--dui-duration-fast)"),
      motionFast: read("transition-duration", "var(--dui-motion-duration-fast)"),
      normal: read("transition-duration", "var(--dui-duration-normal)"),
      motionNormal: read("transition-duration", "var(--dui-motion-duration-normal)"),
      easing: read("transition-timing-function", "var(--dui-easing-standard)"),
      motionEasing: read("transition-timing-function", "var(--dui-motion-easing-standard)"),
    };
    probe.remove();
    return out;
  });
  expect(result.level1).not.toBe("none");
  expect(result.shadowRaised).toBe(result.level1);
  expect(result.raised).toBe(result.level1);
  expect(result.fast).toBe(result.motionFast);
  expect(result.normal).toBe(result.motionNormal);
  expect(result.easing).toBe(result.motionEasing);
});

for (const colorScheme of schemes) {
  test(`elevation surfaces (${colorScheme}): the same in light, one step lighter per level in dark`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("examples/elevation.html");
    const lightness = await page.evaluate(() => {
      const probe = document.createElement("div");
      document.body.append(probe);
      const ctx = /** @type {CanvasRenderingContext2D} */ (document.createElement("canvas").getContext("2d", { willReadFrequently: true }));
      const out = [0, 1, 2, 3, 4].map((n) => {
        probe.style.backgroundColor = `var(--dui-elevation-${n}-surface)`;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = getComputedStyle(probe).backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return r + g + b;
      });
      probe.remove();
      return out;
    });
    if (colorScheme === "light") expect(new Set(lightness).size).toBe(1);
    else for (let n = 1; n < 5; n++) expect(lightness[n], `level ${n}`).toBeGreaterThan(lightness[n - 1]);
  });
}

test("elevation knobs retune a theme scope", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("examples/elevation.html");
  const result = await page.evaluate(() => {
    const read = (/** @type {Record<string, string>} */ overrides) => {
      const scope = document.createElement("div");
      scope.dataset.theme = "probe";
      Object.entries(overrides).forEach(([k, v]) => scope.style.setProperty(k, v));
      scope.innerHTML = "<div></div>";
      document.body.append(scope);
      const probe = /** @type {HTMLElement} */ (scope.firstElementChild);
      probe.style.backgroundColor = "var(--dui-elevation-raised-surface)";
      probe.style.boxShadow = "var(--dui-elevation-raised)";
      const style = getComputedStyle(probe);
      const out = { surface: style.backgroundColor, shadow: style.boxShadow };
      scope.remove();
      return out;
    };
    return { plain: read({}), step: read({ "--dui-elevation-surface-step": "10%" }), off: read({ "--dui-elevation-strength": "0%" }) };
  });
  expect(result.step.surface).not.toBe(result.plain.surface);
  expect(result.off.shadow).not.toBe(result.plain.shadow);
  expect(result.off.shadow).toMatch(/rgba\(0, 0, 0, 0\)|\/ 0\)|transparent/);
});

test("shadow primitives never spread outward, and every elevated role includes the 1px ring", async ({ page }) => {
  // https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow: the fourth length is the spread.
  const primitives = readFileSync(new URL("../css/tokens/primitives.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const layers = [...primitives.matchAll(/--dui-shadow-\d-(?:key|ambient):\s*([^;]+);/g)].map((m) => m[1].trim());
  expect(layers.length).toBeGreaterThan(0);
  for (const layer of layers) {
    const lengths = layer.split(/\s+/);
    expect(lengths, layer).toHaveLength(4);
    expect(Number.parseFloat(lengths[3]), layer).toBeLessThanOrEqual(0);
  }
  await page.goto("examples/elevation.html");
  const shadows = await page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const out = Object.fromEntries(
      ["raised", "panel", "overlay", "popover", "dialog"].map((role) => {
        probe.style.boxShadow = `var(--dui-elevation-${role})`;
        return [role, getComputedStyle(probe).boxShadow];
      }),
    );
    probe.remove();
    return out;
  });
  for (const [role, shadow] of Object.entries(shadows)) expect(shadow, role).toMatch(/0px 0px 0px 1px/);
});

test("--dui-radius-scale: 0 gives square corners, 1.5 rounder ones", async ({ page }) => {
  await page.goto("examples/theming.html");
  const radii = await page.evaluate(() =>
    ["radius-0-title", "radius-1-title", "radius-15-title"].map((id) => {
      const panel = /** @type {Element} */ (document.getElementById(id)?.closest("section"));
      return {
        button: getComputedStyle(/** @type {Element} */ (panel.querySelector("button"))).borderTopLeftRadius,
        card: getComputedStyle(/** @type {Element} */ (panel.querySelector("[data-card]"))).borderTopLeftRadius,
      };
    }),
  );
  expect(radii[0]).toEqual({ button: "0px", card: "0px" });
  expect(radii[1]).toEqual({ button: "8px", card: "12px" });
  expect(radii[2]).toEqual({ button: "12px", card: "18px" });
});

test.describe("forced colors", () => {
  test.beforeEach(async ({ page }) => {
    await withoutMotion(page);
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("examples/elevation.html");
  });

  /** A visible border on every side: a width, a style and a color that is not transparent. Runs in the page. */
  const border = (/** @type {Element} */ el) => {
    const style = getComputedStyle(el);
    return ["top", "right", "bottom", "left"].map((side) => {
      const width = Number.parseFloat(style.getPropertyValue(`border-${side}-width`));
      const kind = style.getPropertyValue(`border-${side}-style`);
      const color = style.getPropertyValue(`border-${side}-color`);
      return width > 0 && kind !== "none" && kind !== "hidden" && color !== "rgba(0, 0, 0, 0)" && color !== "transparent";
    });
  };

  test("card, panel, popover, menu and dialog keep a visible border in place of their shadow", async ({ page }) => {
    expect(await page.locator("[data-card]").first().evaluate(border)).toEqual([true, true, true, true]);
    for (const panel of await page.locator(".level", { hasText: "Role: panel" }).all()) expect(await panel.evaluate(border)).toEqual([true, true, true, true]);

    await page.getByRole("button", { name: "Popover" }).click();
    await expect(page.locator("#role-popover")).toBeVisible();
    expect(await page.locator("#role-popover").evaluate(border)).toEqual([true, true, true, true]);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.locator("#role-menu")).toBeVisible();
    expect(await page.locator("#role-menu").evaluate(border)).toEqual([true, true, true, true]);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Dialog" }).click();
    await expect(page.locator("#role-dialog")).toBeVisible();
    expect(await page.locator("#role-dialog").evaluate(border)).toEqual([true, true, true, true]);
  });
});

test("durations are 120, 200 and 300ms, and the spring easing is linear() where supported", async ({ page }) => {
  await page.goto("examples/motion.html");
  const out = await page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const read = (/** @type {string} */ token) => {
      probe.style.transitionDuration = `var(${token})`;
      return getComputedStyle(probe).transitionDuration;
    };
    probe.style.transitionTimingFunction = "var(--dui-motion-easing-spring)";
    const spring = getComputedStyle(probe).transitionTimingFunction;
    const out = { fast: read("--dui-motion-duration-fast"), normal: read("--dui-motion-duration-normal"), slow: read("--dui-motion-duration-slow"), spring, supported: CSS.supports("transition-timing-function", "linear(0, 1)") };
    probe.remove();
    return out;
  });
  expect([out.fast, out.normal, out.slow]).toEqual(["0.12s", "0.2s", "0.3s"]);
  if (out.supported) expect(out.spring).toMatch(/^linear\(/);
  else expect(out.spring).toMatch(/^cubic-bezier\(/);
});
