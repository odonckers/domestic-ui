// @ts-check
import { test, expect } from "@playwright/test";
import { schemes } from "./helpers.js";

/*
 * Token contrast for one theme scope. axe checks text it can see, not
 * focus rings, control borders or hover states. Each pair is
 * [foreground, background, minimum ratio].
 * WCAG 1.4.3: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
 * WCAG 1.4.11: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
 *
 * Ratios use the color the browser paints. A canvas gamut-maps OKLCH
 * into sRGB, so an out-of-gamut value is judged as drawn.
 * Later themes call registerContrastTests with their own scope.
 */
export const PAIRS = [
  ["--dui-color-text", "--dui-color-surface", 4.5],
  ["--dui-color-text", "--dui-color-surface-raised", 4.5],
  ["--dui-color-text", "--dui-color-surface-sunken", 4.5],
  ["--dui-color-text-muted", "--dui-color-surface", 4.5],
  ["--dui-color-text-muted", "--dui-color-surface-raised", 4.5],
  ["--dui-color-text-muted", "--dui-color-surface-sunken", 4.5],
  ["--dui-color-link", "--dui-color-surface", 4.5],
  ["--dui-color-link", "--dui-color-surface-raised", 4.5],
  ["--dui-color-link-visited", "--dui-color-surface", 4.5],
  ["--dui-color-link-visited", "--dui-color-surface-raised", 4.5],
  ["--dui-color-accent-text", "--dui-color-surface", 4.5],
  ["--dui-color-accent-text", "--dui-color-surface-raised", 4.5],
  ["--dui-color-accent-text", "--dui-color-surface-sunken", 4.5],
  ["--dui-color-accent-contrast", "--dui-color-accent", 4.5],
  ["--dui-color-accent-contrast", "--dui-color-accent-hover", 4.5],
  ["--dui-color-primary-contrast", "--dui-color-primary", 4.5],
  ["--dui-color-primary-contrast", "--dui-color-primary-hover", 4.5],
  ["--dui-color-danger", "--dui-color-surface", 4.5],
  ["--dui-color-success", "--dui-color-surface", 4.5],
  ["--dui-color-mark-text", "--dui-color-mark", 4.5],
  ["--dui-color-border-control", "--dui-color-surface", 3],
  ["--dui-color-border-control", "--dui-color-surface-raised", 3],
  ["--dui-color-focus", "--dui-color-surface", 3],
  ["--dui-color-focus", "--dui-color-surface-raised", 3],
  ["--dui-color-focus", "--dui-color-surface-sunken", 3],
  ["--dui-color-accent", "--dui-color-surface", 3],
  ["--dui-color-accent", "--dui-color-surface-raised", 3],
  ["--dui-color-accent", "--dui-color-surface-sunken", 3],
  ["--dui-color-primary", "--dui-color-surface", 3],
  ["--dui-color-primary", "--dui-color-surface-raised", 3],

  // Atoms: buttons (css/components/atoms/button.css), default and hover.
  // Primary text is primary-contrast on primary / primary-hover (above).
  // Secondary text is text on surface-raised / surface-sunken (above).
  // Quiet text is accent-text on the surface and, on hover, on surface-sunken (above).
  // Focus ring: the outer ring sits on the surface; it must also stand out from
  // each fill it touches. Primary adds an inner ring in its text color.
  ["--dui-color-primary-contrast", "--dui-color-primary", 3], // primary inner ring on fill
  ["--dui-color-primary-contrast", "--dui-color-primary-hover", 3], // primary inner ring, hover

  // Atoms: switch (css/components/atoms/switch.css). Track border and off thumb
  // are --dui-color-border-control on the surface (above).
  ["--dui-color-accent-hover", "--dui-color-surface", 3], // on track, hover
  ["--dui-color-text-muted", "--dui-color-surface", 3], // off track border, hover

  // Atoms: badges (css/components/atoms/badge.css). Neutral is text on surface-sunken (above).
  ["--dui-color-accent-text", "--dui-color-accent-surface", 4.5],
  ["--dui-color-accent", "--dui-color-accent-surface", 3],
  ["--dui-color-success", "--dui-color-success-surface", 4.5],
  ["--dui-color-warning", "--dui-color-warning-surface", 4.5],
  ["--dui-color-danger", "--dui-color-danger-surface", 4.5],
  ["--dui-color-warning", "--dui-color-surface", 4.5], // same as danger and success above

  // Atoms: field (css/components/atoms/field.css). Hint is muted text and error is
  // danger on the surface; the invalid border is danger on the surface (all above).

  // Molecules: alerts (css/components/molecules/alerts.css). Body text and links on each
  // tinted surface; the prefix word in the tone color (danger, success, warning above);
  // the inline-start rule and the icon disc are the tone against the surface and the tint;
  // the icon glyph is the surface on the tone (same ratio as tone on surface).
  ["--dui-color-info", "--dui-color-surface", 4.5],
  ["--dui-color-info", "--dui-color-info-surface", 4.5],
  ["--dui-color-text", "--dui-color-info-surface", 4.5],
  ["--dui-color-text", "--dui-color-success-surface", 4.5],
  ["--dui-color-text", "--dui-color-warning-surface", 4.5],
  ["--dui-color-text", "--dui-color-danger-surface", 4.5],
  ["--dui-color-link", "--dui-color-info-surface", 4.5],
  ["--dui-color-link", "--dui-color-success-surface", 4.5],
  ["--dui-color-link", "--dui-color-warning-surface", 4.5],
  ["--dui-color-link", "--dui-color-danger-surface", 4.5],
  ["--dui-color-focus", "--dui-color-info-surface", 3], // focus ring on links inside alerts
  ["--dui-color-focus", "--dui-color-warning-surface", 3],
  ["--dui-color-focus", "--dui-color-danger-surface", 3],
  ["--dui-color-focus", "--dui-color-success-surface", 3],

  // Molecules: tabs and nav (tabs.css, nav.css). Unselected tabs are muted text on the
  // surface and on the hover fill (above). The selected tab bar and the current nav bar are
  // accent on the surface (above) and, for nav, on the accent tint; current nav text is text on it.
  ["--dui-color-text", "--dui-color-accent-surface", 4.5],
  ["--dui-color-focus", "--dui-color-accent-surface", 3], // also pressed toolbar toggles

  // Molecules: pagination (pagination.css). Links on the surface and on hover; the current
  // page is accent-contrast on accent (above), and its fill reaches 3:1 against the surface.
  ["--dui-color-link", "--dui-color-surface-sunken", 4.5],

  // Molecules: toolbar (toolbar.css). Pressed text is accent-text on the accent tint (above).

  // Molecules: card (card.css). Text, muted text and links on the raised surface, and button
  // borders on it, are above. Tooltip (popover.css): inverse text on the inverse surface.
  ["--dui-color-text-inverse", "--dui-color-surface-inverse", 4.5],
  ["--dui-color-surface-inverse", "--dui-color-surface", 3], // tooltip edge against the page

  // Code highlighting (css/base/typography.css): every ::highlight(dui-code-*) color on the
  // <pre> background.
  ...["keyword", "string", "comment", "tag", "attribute", "property", "number", "punctuation"].map((name) => [
    `--dui-color-code-${name}`,
    "--dui-color-surface-sunken",
    4.5,
  ]),

  // Elevation (PRINCIPLES.md, "Elevation"): text, muted text, links, quiet-button and error text,
  // control borders and the focus ring on every level's surface and every role's surface.
  // The accent solid is one indigo in both schemes, so on the lightest dark elevation
  // steps it can fall under 3:1. The focus ring uses accent text in dark, which is the pair below.
  ...[0, 1, 2, 3, 4, "flat", "raised", "panel", "overlay", "popover", "dialog"].flatMap((level) => {
    const surface = `--dui-elevation-${level}-surface`;
    return [
      ["--dui-color-text", surface, 4.5],
      ["--dui-color-text-muted", surface, 4.5],
      ["--dui-color-link", surface, 4.5],
      ["--dui-color-link-visited", surface, 4.5],
      ["--dui-color-accent-text", surface, 4.5],
      ["--dui-color-danger", surface, 4.5],
      ["--dui-color-border-control", surface, 3],
      ["--dui-color-focus", surface, 3],
    ];
  }),
];

/**
 * Resolve tokens to sRGB on a probe inside `scopeSelector`, then compute
 * WCAG contrast ratios. A canvas normalizes any CSS color syntax
 * (light-dark(), color-mix(), oklch(), relative color) to sRGB bytes,
 * including a gamut-mapped out-of-gamut color.
 * @param {string} scopeSelector
 * @param {[string, string, number][]} pairs
 */
const measure = (scopeSelector, pairs) => {
  const scope = document.querySelector(scopeSelector);
  if (!scope) throw new Error(`No element matches ${scopeSelector}`);
  const probe = document.createElement("span");
  scope.append(probe);
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgb = (token) => {
    probe.style.color = `var(${token})`;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = getComputedStyle(probe).color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  };
  const luminance = ([r, g, b]) => {
    const [R, G, B] = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };
  const results = pairs.map(([fg, bg, min]) => {
    const a = luminance(rgb(fg));
    const b = luminance(rgb(bg));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    return { pair: `${fg} on ${bg}`, ratio: Math.round(ratio * 100) / 100, min };
  });
  probe.remove();
  return results;
};

/**
 * Run the contrast pairs against one theme scope, in light and dark.
 * @param {{ name: string, selector: string, pagePath?: string, pairs?: typeof PAIRS }} scope
 */
export function registerContrastTests({ name, selector, pagePath = "examples/theming.html", pairs = PAIRS }) {
  for (const colorScheme of schemes) {
    test(`${name} token pairs meet WCAG 2.2 AA (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(pagePath);
      const results = await page.evaluate(([s, p]) => (0, eval)(`(${s})`)(...p), [measure.toString(), [selector, pairs]]);
      const failing = results.filter((r) => r.ratio < r.min);
      expect(failing, JSON.stringify(results, null, 2)).toEqual([]);
    });
  }
}
