// @ts-check
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { blockExternalRequests, withoutMotion } from "./helpers.js";
// Builds _site/ when this file is collected, so the docs home is served at /_site/.
import "./docs-helpers.js";

/*
 * Screenshot baselines for the pages whose look is easy to break and hard to
 * see in a unit test. Chromium only, and only on Linux unless VISUAL=1: the
 * images are committed from Linux, where CI runs, so a macOS font rasterizer
 * does not fail `npm test`.
 *
 * https://playwright.dev/docs/test-snapshots
 * https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
 * https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
 *
 * Our choice: two CSS viewports, a wide window and a narrow one. 390px is the
 * narrow reflow width; the shell's own container queries decide what stacks.
 * Forced colors is its own appearance, shot with the light color scheme.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INTER_CSS = "css/fonts/inter.css";

/** @typedef {{ id: string, path: string, prepare?: (page: import("@playwright/test").Page) => Promise<void> }} VisualPage */
/**
 * A theme scope applied to every shot it includes.
 * Prebuilt themes append an entry: `theme` is the data-theme value,
 * `stylesheet` is the opt-in file from the server root (css/themes/calm.css),
 * and `pages` limits the shots (omit it to shoot every page).
 * @typedef {{ id: string, theme?: string, stylesheet?: string, pages?: string[] }} ThemeScope
 */

const SANS = "Domestic Test Sans";
const MONO = "Domestic Test Mono";

/** @param {string} family @param {string} file @param {string} style */
const face = (family, file, style) => `@font-face {
  font-family: "${family}";
  src: url("/tests/fonts/${file}") format("woff2");
  font-weight: 200 900;
  font-style: ${style};
  font-display: block;
}`;

/**
 * A fixed face, so baselines do not follow the host's system-ui.
 * Our choice: the bundled test faces, unless the optional self-hosted Inter
 * stylesheet is in the tree (css/fonts/inter.css). That file is not imported
 * by css/domestic.css; this spec opts in for the shot only. The mono face
 * stays bundled either way.
 */
function baselineFont() {
  const interPath = join(ROOT, INTER_CSS);
  const useInter = existsSync(interPath);
  let sans = SANS;
  if (useInter) {
    const css = readFileSync(interPath, "utf8");
    const match = css.match(/font-family:\s*(?:"([^"]+)"|'([^']+)'|([^;}{]+))/);
    sans = (match?.[1] || match?.[2] || match?.[3] || "Inter").trim();
  }
  const faces = [
    face(MONO, "source-code-pro-latin.woff2", "normal"),
    face(MONO, "source-code-pro-latin-italic.woff2", "italic"),
  ];
  if (!useInter) {
    faces.unshift(face(SANS, "source-sans-3-latin.woff2", "normal"), face(SANS, "source-sans-3-latin-italic.woff2", "italic"));
  }
  const css = `${faces.join("\n")}
html {
  --dui-font-body: "${sans}", sans-serif !important;
  --dui-font-heading: "${sans}", sans-serif !important;
  --dui-font-mono: "${MONO}", monospace !important;
  font-synthesis: none;
}`;
  return { sans, mono: MONO, css, stylesheet: useInter ? `/${INTER_CSS}` : "" };
}

const font = baselineFont();

for (const file of ["source-sans-3-latin.woff2", "source-sans-3-latin-italic.woff2", "source-code-pro-latin.woff2", "source-code-pro-latin-italic.woff2"]) {
  if (!existsSync(join(ROOT, "tests/fonts", file))) throw new Error(`missing tests/fonts/${file}`);
}

/** @type {VisualPage[]} */
const pages = [
  { id: "docs-home", path: "_site/index.html" },
  { id: "button", path: "examples/atoms/button.html" },
  { id: "field", path: "examples/atoms/field.html" },
  { id: "card", path: "examples/molecules/card.html" },
  {
    id: "dialog",
    path: "examples/molecules/dialog.html",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Delete project…" }).click();
      await expect(page.getByRole("dialog", { name: "Delete project?" })).toBeVisible();
    },
  },
  { id: "data-table", path: "examples/organisms/data-table.html" },
  { id: "nav", path: "examples/molecules/nav.html" },
  { id: "app-shell", path: "examples/app-shell.html" },
];

/** CSS viewports. 1280×800 is a desktop window; 390×844 is the narrow reflow width. */
const viewports = [
  { name: "1280", width: 1280, height: 800 },
  { name: "390", width: 390, height: 844 },
];

/** @type {const} */
const appearances = [
  { name: "light", colorScheme: "light", forcedColors: "none" },
  { name: "dark", colorScheme: "dark", forcedColors: "none" },
  { name: "forced", colorScheme: "light", forcedColors: "active" },
];

/** @type {ThemeScope[]} */
const themeScopes = [{ id: "default" }];

test.use({ locale: "en-US", timezoneId: "UTC" });
test.describe.configure({ timeout: 45_000 });
test.skip(({ browserName }) => browserName !== "chromium", "Screenshot baselines are Chromium only.");
test.skip(() => process.platform !== "linux" && process.env.VISUAL !== "1", "Screenshot baselines are Linux Chromium. Set VISUAL=1 to run on this platform.");

/**
 * @param {import("@playwright/test").Page} page
 * @param {ThemeScope} scope
 */
async function installScope(page, scope) {
  await withoutMotion(page);
  const stylesheets = [font.stylesheet, scope.stylesheet ?? ""].map((href) => (href && !href.startsWith("/") ? `/${href}` : href)).filter(Boolean);
  await page.addInitScript(
    ({ css, stylesheets, theme }) => {
      const apply = () => {
        const root = document.documentElement;
        if (!root) return;
        if (theme) root.setAttribute("data-theme", theme);
        const parent = document.head || root;
        for (const href of stylesheets) {
          if (document.querySelector(`link[data-visual-sheet="${href}"]`)) continue;
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          link.setAttribute("data-visual-sheet", href);
          parent.append(link);
        }
        if (!document.getElementById("visual-baseline")) {
          const style = document.createElement("style");
          style.id = "visual-baseline";
          style.textContent = css;
          parent.append(style);
        }
      };
      if (document.documentElement) apply();
      else
        new MutationObserver((_, observer) => {
          if (!document.documentElement) return;
          apply();
          observer.disconnect();
        }).observe(document, { childList: true });
    },
    { css: font.css, stylesheets, theme: scope.theme ?? "" },
  );
}

/** Wait until the baseline faces are the ones actually used, including live-example frames. */
async function settle(/** @type {import("@playwright/test").Page} */ page) {
  const failed = await page.evaluate(async (families) => {
    const frames = [...document.querySelectorAll("iframe")].filter((frame) => frame instanceof HTMLIFrameElement);
    await Promise.all(
      frames.map(
        (frame) =>
          new Promise((resolve) => {
            if (frame.contentDocument?.readyState === "complete") resolve(undefined);
            else frame.addEventListener("load", () => resolve(undefined), { once: true });
          }),
      ),
    );
    const docs = [document, ...frames.map((frame) => frame.contentDocument).filter((doc) => doc instanceof Document)];
    /** @type {string[]} */
    const missing = [];
    for (const doc of docs) {
      await doc.fonts.ready;
      for (const family of families) {
        for (const spec of [`400 16px "${family}"`, `600 16px "${family}"`, `700 16px "${family}"`]) {
          await doc.fonts.load(spec);
          if (!doc.fonts.check(spec)) missing.push(spec);
        }
      }
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
    return missing;
  }, [font.sans, font.mono]);
  expect(failed, "baseline font did not load").toEqual([]);
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family.toLowerCase()).toContain(font.sans.toLowerCase());
}

for (const scope of themeScopes) {
  test.describe(scope.id, () => {
    for (const shot of pages) {
      if (scope.pages && !scope.pages.includes(shot.id)) continue;
      for (const viewport of viewports) {
        for (const appearance of appearances) {
          test(`${shot.id} ${viewport.name} ${appearance.name}`, async ({ page, baseURL }) => {
            const external = await blockExternalRequests(page, /** @type {string} */ (baseURL));
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.emulateMedia({ colorScheme: appearance.colorScheme, forcedColors: appearance.forcedColors, reducedMotion: "reduce" });
            await installScope(page, scope);
            await page.goto(shot.path);
            await settle(page);
            if (shot.prepare) await shot.prepare(page);
            await expect(page).toHaveScreenshot(`${scope.id}-${shot.id}-${viewport.name}-${appearance.name}.png`);
            expect(external, "screenshot pages must not leave the local server").toEqual([]);
          });
        }
      }
    }
  });
}
