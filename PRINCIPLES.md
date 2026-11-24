# Principles

domestic-ui packages existing web standards and well-known patterns. Nothing here is
original: the rules below come from the [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/),
the [W3C CSS specifications](https://www.w3.org/Style/CSS/specs.en.html),
[WCAG 2.2](https://www.w3.org/TR/WCAG22/), the
[ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) and
[MDN Web Docs](https://developer.mozilla.org/). Where we had to pick between valid
options, the pick is labeled **Our choice:** with one line saying why.

## 1. Native element first

- Use the HTML element that already has the semantics and behavior you need:
  `<button>`, `<a href>`, `<dialog>`, `<details>`, `<label>`, `<fieldset>`, `<table>`.
  This is the [first rule of ARIA use](https://www.w3.org/TR/using-aria/#rule1) in W3C *Using ARIA*.
- Add ARIA only when native HTML cannot express something, and only in the ways
  [ARIA in HTML](https://www.w3.org/TR/html-aria/) allows. Never add a role an element
  already has (see the [document conformance rules](https://www.w3.org/TR/html-aria/#docconformance)).
- When an interactive widget has no native element, follow its
  [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) exactly.
- Native behavior beats script: open a `<dialog>` with
  [`showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal)
  or [invoker commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)
  so the browser handles focus, <kbd>Esc</kbd> and inertness.

## 2. Agent-friendly by design

Humans and coding agents should be able to write a whole view from this document alone.

- **Predictable markup.** Plain semantic HTML gets the full look. No wrapper `div`s or
  classes are needed for base elements.
- **One API per thing.** Each layout primitive, utility or component has one documented
  class or attribute, tuned with custom properties, never with modifier classes.
  The API is written in a comment at the top of its CSS file.
- **Paths are API.** `css/domestic.css` and every file under `css/` keep their paths.
  Renaming or moving a file is a breaking change.
- **No hidden JS behavior.** CSS never depends on script. Any script an example uses is
  inline, short, and commented, or one of the documented [web components](web-components/README.md).
- **Our choice:** class and attribute APIs over custom elements, because they work with
  any templating language and need no JavaScript. Custom elements are used only for behavior
  HTML cannot do, and enhance markup that already works without them.

## 3. Accessibility baseline: WCAG 2.2 AA

Every example must pass, and every token pair is tested against, these criteria:

| Topic | Rule | Source |
| --- | --- | --- |
| Text contrast | 4.5:1 for body text, in light **and** dark | [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) |
| Non-text contrast | 3:1 for control boundaries and the focus indicator | [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) |
| Links | Links keep their underline; color is never the only cue | [1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) |
| Focus visible | Every focusable element shows a `:focus-visible` outline | [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) |
| Focus not obscured | `scroll-padding` keeps focused elements clear of sticky edges | [2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) |
| Focus appearance (AAA, optional) | The default 2px solid outline with a 2px offset aims to meet it | [2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) |
| Target size | Controls are at least 36px tall and rows 32px (32px and 28px with `data-density="compact"`, see [Density](explainers/density.md); 44px under a coarse pointer), above the 24px minimum | [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| Reduced motion | Under `prefers-reduced-motion: reduce` movement stops and fades stay; `data-motion="none"` turns transitions off (see [Motion](PRINCIPLES.md#6-motion)) | [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) |
| Color scheme | `color-scheme: light dark` plus [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) in every semantic color | [MDN `color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme) |
| Forced colors | Borders and outlines switch to system colors | [MDN `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) |

- Never remove an outline without a visible replacement.
- Forms: every control has a `<label>`; groups use `<fieldset>` and `<legend>`
  ([W3C forms tutorial](https://www.w3.org/WAI/tutorials/forms/)).
- Tables: a `<caption>` and `th` with `scope` ([W3C tables tutorial](https://www.w3.org/WAI/tutorials/tables/)).
- Images: meaningful `alt` text ([W3C images tutorial](https://www.w3.org/WAI/tutorials/images/)).
- Force a scheme on the page or any subtree with `data-color-scheme="light"` or `"dark"`.

## 4. Cascade layers

`css/domestic.css` declares the order once, before anything else
([`@layer` on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer),
[CSS Cascade 5](https://www.w3.org/TR/css-cascade-5/#layering)):

```css
@layer reset, tokens, base, layout, components, utilities;
```

Later layers win over earlier ones regardless of selector specificity, and **your own
unlayered CSS beats all of them**, so overriding never needs `!important` or specificity tricks.

| Layer | Contents |
| --- | --- |
| `reset` | A modest reset: `box-sizing`, zero margins, block media, inherited form fonts |
| `tokens` | Primitive and semantic custom properties |
| `base` | Native elements: typography, lists, tables, forms, buttons, dialog, details, focus |
| `layout` | `.stack`, `.cluster`, `.grid`, `[data-scroll]` and the page layouts (list-detail, split, dashboard, action bar, app shell) |
| `components` | Atoms in `css/components/atoms/` (M2), molecules in `css/components/molecules/` (M3a) and organisms in `css/components/organisms/` (M3b). See the [atoms index](css/components/atoms/README.md), the [molecules index](css/components/molecules/README.md) and the [organisms index](css/components/organisms/README.md) |
| `utilities` | Single-purpose helpers such as `.visually-hidden`; last so they always apply |

**Our choice:** this order, because each layer only refines the ones before it, and a
utility should beat a component the way an inline override would.

## 5. Theming

### Two tiers of tokens

All tokens are [custom properties](https://www.w3.org/TR/css-variables-1/) on `:root`
with the `--dui-` prefix.

| Tier | File | Named by | Example | Public? |
| --- | --- | --- | --- | --- |
| Primitive | `css/tokens/primitives.css` | What it is | `--dui-color-indigo-9: oklch(53% 0.215 272);` `--dui-space-5: 1rem;` | No. Internal, may change in any release. |
| Semantic | `css/tokens/semantic.css` | What it is for | `--dui-color-accent: light-dark(var(--dui-color-indigo-9), var(--dui-color-indigo-dark-9));` | **Yes.** The stable theming API. |

**Base, layout, utility and component CSS reference only semantic tokens.** They never use
primitives and never hard-code colors or sizes (`0`, `1px` hairlines, percentages, `fr`,
`currentcolor`, `inherit`, `transparent` and system colors are fine). `npm test` enforces
this with `scripts/check-tokens.mjs` (`npm run lint:tokens`), which also rejects literal
colors in `semantic.css`.

**Our choice:** the `--dui-` prefix, so tokens never collide with your own custom properties.

### Color

Color primitives are [`oklch()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch) in [OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab) (CSS Color 4), inside the sRGB gamut. Neutral and indigo each have 12 steps in light and in dark. The step number is the role:

| Step | Role |
| --- | --- |
| 1 | Page |
| 2 | Raised |
| 3 | Sunken or element |
| 4 | Hover |
| 5 | Active or selected |
| 6 | Subtle border |
| 7 | Border |
| 8 | Control border |
| 9 | Solid |
| 10 | Solid hover |
| 11 | Muted or accent text |
| 12 | Text |

Red, green, amber and blue have steps 3, 9 and 11. [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) numbers a scale the same way; [Tailwind v4](https://tailwindcss.com/docs/colors) and [Geist](https://vercel.com/geist/colors) also ship OKLCH ramps. Those are other systems, for comparison.

**Our choice:** the default is monochrome. `--dui-color-primary` is neutral step 12 (near-black on a light page, near-white on a dark page). `--dui-color-primary-contrast` is the text on that fill (white, or the dark page color). `--dui-color-primary-hover` is a [relative color](https://www.w3.org/TR/css-color-5/#relative-colors) of the primary ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Colors/Using_relative_colors)), so it keeps the primary's hue. Primary buttons and `type="submit"` read these three. The accent is indigo, for links, focus rings and selection. A theme that painted primary buttons with `--dui-color-accent` sets `--dui-color-primary` (and `--dui-color-primary-contrast` when the fill needs different text).

`--dui-color-accent-text` is a relative color of `--dui-color-accent`: the same hue, with lightness and chroma set for [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). `--dui-color-link` points at it. `--dui-color-focus` is the accent solid in light and the accent text in dark, so the ring meets [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) on a dark page. `--dui-color-accent-hover` and `--dui-color-accent-surface` are derived from the accent too, so a theme that sets only `--dui-color-accent` still gets a matching link, hover and tint. `--dui-color-accent-contrast` is white in both schemes.

`--dui-color-border` is the text color at about 11% alpha, a hairline in the neutral hue. `--dui-color-border-control` stays an opaque step at 3:1. `--dui-color-shadow` is tinted with the neutral hue.

Light and dark values use [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark) ([CSS Color 5](https://www.w3.org/TR/css-color-5/)). `tests/contrast.js` checks the pairs below, and the status and code colors, against these thresholds. It takes a theme scope, so another theme can reuse it.

### A theme is a semantic-token override

No build step. Override semantic tokens on `:root` for the whole page, or on any element
with a `data-theme` attribute or a `theme-*` class to scope it:

```css
[data-theme="forest"] {
  --dui-color-surface: light-dark(#f7f5ef, #141a16);
  --dui-color-text: light-dark(#1d2a22, #e4ebe3);
  --dui-color-accent: light-dark(#2f6b3f, #7fcf95);
  --dui-color-accent-contrast: light-dark(#fff, #0f1a13);
  --dui-color-primary: light-dark(#173528, #d7f5e3);
  --dui-color-primary-contrast: light-dark(#fff, #0f1a13);
}
```

```html
<section data-theme="forest">…</section>
```

[`examples/theming.html`](examples/theming.html) shows a full scoped theme next to the default.
Shape has one knob: `--dui-radius-scale` multiplies `--dui-radius-control` (8px) and
`--dui-radius-surface` (12px); `0` gives square corners and `1.5` rounder ones, while pills stay round.
Radix Themes has the same idea ([`--radius-factor`](https://www.radix-ui.com/themes/docs/theme/radius)), for comparison.
Check your theme's contrast in both schemes; `tests/tokens.spec.js` shows how.

A few semantic tokens are defined in terms of others (`--dui-color-accent-text`,
`--dui-color-link`, `--dui-color-focus`, `--dui-color-accent-hover` and
`--dui-color-accent-surface` follow `--dui-color-accent`; `--dui-color-primary-hover`
follows `--dui-color-primary`; the badge tints `--dui-color-*-surface` mix a tone into
`--dui-color-surface`). A custom property's `var()` is
resolved on the element that declares it ([CSS Variables, "Resolving dependency cycles"](https://www.w3.org/TR/css-variables-1/#cycles)),
so these, plus `color`, `background-color` and `font-family`, are re-applied on every
`[data-theme]`, `.theme-*` and `[data-color-scheme]` element.
**Our choice:** `data-theme` (or a `theme-*` class) as the single scoping API, so one attribute
makes an element a theme root. An override on any other selector (say `.sidebar`) still
reaches properties that read the token directly on an element (borders, buttons, links,
headings, controls), but not inherited text color, background or derived tokens. Add
`data-theme` to that element to get the full effect.

### Semantic tokens (public API)

Renaming or removing a semantic token is a **breaking change**. Primitives are internal and
may change. Fluid `--dui-step-*` values are `clamp()` expressions; see `primitives.css`.

| Token | Purpose | Default (primitive, light / dark) |
| --- | --- | --- |
| `--dui-color-surface` | Page and control background (neutral step 1) | light: `neutral-1` (`oklch(99.3% 0.002 265)`)<br>dark: `neutral-dark-1` (`oklch(16.5% 0.006 265)`) |
| `--dui-color-surface-raised` | Slightly lifted areas: neutral buttons, zebra rows, cards (step 2) | light: `neutral-2` (`oklch(98.2% 0.003 265)`)<br>dark: `neutral-dark-2` (`oklch(19% 0.007 265)`) |
| `--dui-color-surface-sunken` | Recessed areas: code, button hover (step 3) | light: `neutral-3` (`oklch(96.2% 0.005 265)`)<br>dark: `neutral-dark-3` (`oklch(22% 0.009 265)`) |
| `--dui-color-text` | Body text (step 12) | light: `neutral-12` (`oklch(21.5% 0.012 265)`)<br>dark: `neutral-dark-12` (`oklch(95% 0.004 265)`) |
| `--dui-color-text-muted` | Secondary text, captions, list markers (step 11, still 4.5:1) | light: `neutral-11` (`oklch(47.5% 0.016 265)`)<br>dark: `neutral-dark-11` (`oklch(76% 0.012 265)`) |
| `--dui-color-border` | Decorative hairline: the text color at about 11% alpha | light: `neutral-12` at 11% (`oklch(21.5% 0.012 265 / 11%)`)<br>dark: `neutral-dark-12` at 10% (`oklch(95% 0.004 265 / 10%)`) |
| `--dui-color-border-control` | Form control and button boundaries (step 8, 3:1) | light: `neutral-8` (`oklch(58.5% 0.016 265)`)<br>dark: `neutral-dark-8` (`oklch(58% 0.016 265)`) |
| `--dui-color-primary` | Primary action fill (neutral step 12) | light: `neutral-12` (`oklch(21.5% 0.012 265)`)<br>dark: `neutral-dark-12` (`oklch(95% 0.004 265)`) |
| `--dui-color-primary-contrast` | Text on the primary fill | light: `white` (`oklch(100% 0 0)`)<br>dark: `neutral-dark-1` (`oklch(16.5% 0.006 265)`) |
| `--dui-color-accent` | Accent solid for focus rings, selection and checks (indigo step 9) | light: `indigo-9` (`oklch(53% 0.215 272)`)<br>dark: `indigo-dark-9` (`oklch(53% 0.215 272)`) |
| `--dui-color-accent-contrast` | Text on the accent fill, white in both schemes | `white` (`oklch(100% 0 0)`) |
| `--dui-color-link-visited` | Visited links | light: `purple-11` (`oklch(46.2% 0.195 299)`)<br>dark: `purple-dark-11` (`oklch(80.1% 0.127 306)`) |
| `--dui-color-danger` | Errors, :user-invalid borders (red step 11) | light: `red-11` (`oklch(48% 0.16 27)`)<br>dark: `red-dark-11` (`oklch(80% 0.114 27)`) |
| `--dui-color-success` | Success messages (green step 11) | light: `green-11` (`oklch(47% 0.128 150)`)<br>dark: `green-dark-11` (`oklch(80% 0.12 150)`) |
| `--dui-color-warning` | Warning badges and messages (amber step 11) | light: `amber-11` (`oklch(47% 0.098 75)`)<br>dark: `amber-dark-11` (`oklch(80% 0.12 75)`) |
| `--dui-color-info` | Informational alerts and toasts (blue step 11, separate from the accent, so a brand color never reads as a status) | light: `blue-11` (`oklch(48% 0.12 245)`)<br>dark: `blue-dark-11` (`oklch(80% 0.108 245)`) |
| `--dui-color-mark` | mark and ::selection background | light: `yellow-3` (`oklch(95.3% 0.093 99)`)<br>dark: `yellow-dark-9` (`oklch(83.4% 0.141 97)`) |
| `--dui-color-mark-text` | Text on mark | `neutral-12` (`oklch(21.5% 0.012 265)`) |
| `--dui-color-backdrop` | dialog::backdrop | light: `black-a40` (`oklch(0% 0 0 / 40%)`)<br>dark: `black-a60` (`oklch(0% 0 0 / 60%)`) |
| `--dui-color-shadow` | Shadow color, tinted with the neutral hue | light: `neutral-shadow` (`oklch(25% 0.015 265 / 12%)`)<br>dark: `neutral-dark-shadow` (`oklch(14% 0.015 265 / 46%)`) |
| `--dui-color-code-keyword` | JS keywords and CSS at-rules in highlighted code (4.5:1 on surface-sunken) | light: `purple-11` (`oklch(46.2% 0.195 299)`)<br>dark: `purple-dark-11` (`oklch(80.1% 0.127 306)`) |
| `--dui-color-code-string` | Strings and HTML attribute values in highlighted code (4.5:1 on surface-sunken) | light: `green-11` (`oklch(47% 0.128 150)`)<br>dark: `green-dark-11` (`oklch(80% 0.12 150)`) |
| `--dui-color-code-comment` | Comments in highlighted code (4.5:1 on surface-sunken) | light: `neutral-11` (`oklch(47.5% 0.016 265)`)<br>dark: `neutral-dark-11` (`oklch(76% 0.012 265)`) |
| `--dui-color-code-tag` | HTML tag names and CSS selectors in highlighted code (4.5:1 on surface-sunken) | light: `blue-11` (`oklch(48% 0.12 245)`)<br>dark: `blue-dark-11` (`oklch(80% 0.108 245)`) |
| `--dui-color-code-attribute` | HTML attribute names in highlighted code (4.5:1 on surface-sunken) | light: `amber-11` (`oklch(47% 0.098 75)`)<br>dark: `amber-dark-11` (`oklch(80% 0.12 75)`) |
| `--dui-color-code-property` | CSS and JS properties in highlighted code (4.5:1 on surface-sunken) | light: `teal-11` (`oklch(49.1% 0.081 203)`)<br>dark: `teal-dark-11` (`oklch(77.3% 0.099 203)`) |
| `--dui-color-code-number` | Numbers and units in highlighted code (4.5:1 on surface-sunken) | light: `red-11` (`oklch(48% 0.16 27)`)<br>dark: `red-dark-11` (`oklch(80% 0.114 27)`) |
| `--dui-color-code-punctuation` | Brackets, braces and separators in highlighted code (4.5:1 on surface-sunken) | light: `neutral-punctuation` (`oklch(37% 0.016 265)`)<br>dark: `neutral-dark-punctuation` (`oklch(83.5% 0.01 265)`) |
| `--dui-font-body` | Body font stack | `--dui-font-stack-system-ui` (`system-ui, sans-serif`) |
| `--dui-font-mono` | Code font stack | `--dui-font-stack-monospace` (`ui-monospace`, …, `monospace`) |
| `--dui-font-weight-body` | Body weight | `font-weight-400` (400) |
| `--dui-font-weight-strong` | strong, labels, buttons, th | `font-weight-600` (600) |
| `--dui-font-weight-heading` | h1–h6 | `font-weight-700` (700) |
| `--dui-step--1` | small, captions | `--dui-font-size-fluid--1` |
| `--dui-step-0` | Body text, h6 | `--dui-font-size-fluid-0` |
| `--dui-step-1` | h5 | `--dui-font-size-fluid-1` |
| `--dui-step-2` | h4 | `--dui-font-size-fluid-2` |
| `--dui-step-3` | h3 | `--dui-font-size-fluid-3` |
| `--dui-step-4` | h2 | `--dui-font-size-fluid-4` |
| `--dui-step-5` | h1 | `--dui-font-size-fluid-5` |
| `--dui-font-size-code` | code, kbd, samp, pre (relative) | `font-size-relative-90` (0.9em) |
| `--dui-line-height-body` | Body text | `leading-160` (1.6) |
| `--dui-line-height-heading` | Headings, buttons, pre | `leading-125` (1.25) |
| `--dui-line-height-display` | h1 | `leading-110` (1.1) |
| `--dui-letter-spacing-heading` | h1, h2 | `tracking-tight` (-0.015em) |
| `--dui-measure` | Max line length for prose | `size-65ch` (65ch) |
| `--dui-space-3xs` | Space scale | `space-1` (0.125rem) |
| `--dui-space-2xs` | Space scale | `space-2` (0.25rem) |
| `--dui-space-xs` | Space scale | `space-3` (0.5rem) |
| `--dui-space-s` | Space scale | `space-4` (0.75rem) |
| `--dui-space-m` | Space scale; default flow rhythm and .stack gap | `space-5` (1rem) |
| `--dui-space-l` | Space scale; default .grid gap | `space-6` (1.5rem) |
| `--dui-space-xl` | Space scale; space above h1–h3 | `space-7` (2rem) |
| `--dui-space-2xl` | Space scale | `space-8` (3rem) |
| `--dui-space-3xl` | Space scale | `space-9` (4rem) |
| `--dui-size-target` | Comfortable control height (WCAG 2.5.8 needs 24px; this gives 36px) | `size-2-25` (2.25rem); `size-2-75` (2.75rem) under `pointer: coarse` |
| `--dui-size-target-compact` | Compact control height | `size-2` (2rem); `size-2-75` under `pointer: coarse` |
| `--dui-size-target-small` | Small buttons (32px at every pointer, over the 24px minimum) | `size-2` (2rem) |
| `--dui-size-target-large` | Large buttons | `size-2-5` (2.5rem); `size-3-25` (3.25rem) under `pointer: coarse` |
| `--dui-size-target-row` | Comfortable row height of nav, menu, listbox and list items | `size-2` (2rem); `size-2-75` under `pointer: coarse` |
| `--dui-size-target-row-compact` | Compact row height | `size-1-75` (1.75rem); `size-2-75` under `pointer: coarse` |
| `--dui-size-check` | Checkbox and radio size | `size-1-25` (1.25rem) |
| `--dui-size-column-min` | Default .grid min column width | `size-16` (16rem) |
| `--dui-size-menu-min` | Min width of menus and nav dropdowns | `size-12` (12rem) |
| `--dui-size-drawer` | Drawer width (all of the viewport when narrower) | `size-24` (24rem) |
| `--dui-size-page` | Max inline size of a page's content column (the examples' header, main and footer) | `size-72` (72rem) |
| `--dui-size-icon` | Decorative icons beside a label: nav links and group summaries | `size-1-25` (1.25rem) |
| `--dui-size-icon-inline` | Icons inside buttons, menu items, options and toolbars | `size-1` (1rem) |
| `--dui-icon-stroke-width` | Stroke width of `[data-icon]` SVGs, set with the CSS `stroke-width` property | `stroke-1-75` (1.75) |
| `--dui-size-sidebar` | Inline size of an app shell's primary sidebar beside main | `size-16` (16rem) |
| `--dui-size-sidebar-aux` | Inline size of an app shell's auxiliary (inline-end) sidebar beside main | `size-20` (20rem) |
| `--dui-size-pane` | Max block size of a pane that scrolls on its own beside others (the detail of a list-detail when side by side) | `size-100svh` (100svh, the small viewport height) |
| `--dui-radius-scale` | Radius knob: multiplies the control and surface radii; `0` gives square corners | `factor-1` (1) |
| `--dui-radius-control` | Controls, buttons, inline code | `radius-2` (0.5rem, 8px) × `--dui-radius-scale` |
| `--dui-radius-surface` | Panels, cards, pre, dialog, details, media | `radius-3` (0.75rem, 12px) × `--dui-radius-scale` |
| `--dui-radius-pill` | Fully rounded ends (not scaled) | `radius-round` (999rem) |
| `--dui-space-panel-inset` | Gap between a floating panel and the viewport or frame edge | `--dui-space-xs` (0.5rem) |
| `--dui-border-width` | Hairline width | `border-1` (1px) |
| `--dui-border-width-emphasis` | blockquote rule, alert start rule, invalid field | `border-4` (0.25rem) |
| `--dui-border-width-indicator` | Selected tab, current nav item (3:1 against the surface) | `border-3` (3px) |
| `--dui-underline-offset` | Link underline offset | `underline-offset-015em` (0.15em) |
| `--dui-underline-thickness` | Link underline | `underline-1` (0.0625em) |
| `--dui-underline-thickness-hover` | Link underline on hover | `underline-2` (0.125em) |
| `--dui-focus-width` | Focus outline width | `border-2` (2px) |
| `--dui-focus-offset` | Focus outline offset | `border-2` (2px) |
| `--dui-motion-scale` | Multiplies every motion duration | `factor-1` (1) |
| `--dui-motion-movement` | Lets things slide, lift and zoom (1) or not (0); `0` with reduced motion | `factor-1` (1) |
| `--dui-motion-enabled` | `0` with `data-motion="none"`: every duration is `0s`, whatever scale is set inside | `factor-1` (1) |
| `--dui-motion-easing-standard` | State changes that stay on screen: hover, press, switch | `easing-ease-out` (`cubic-bezier(0.2, 0, 0, 1)`) |
| `--dui-motion-easing-enter` | Things arriving: dialogs, drawers, popovers, toasts | `easing-decelerate` (`cubic-bezier(0, 0, 0, 1)`) |
| `--dui-motion-easing-exit` | Things leaving | `easing-accelerate` (`cubic-bezier(0.3, 0, 1, 1)`) |
| `--dui-motion-easing-spring` | Popover, menu and drawer entrances | `easing-spring` (a [`linear()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/linear) spring with no overshoot); `--dui-motion-easing-enter`'s curve where `linear()` is unsupported |
| `--dui-elevation-strength` | How much of `--dui-color-shadow` each shadow uses (0% to 100%) | `mix-100` (100%) |
| `--dui-elevation-surface-step` | Dark scheme: text color mixed into the surface per level | `mix-3` (3%) |
| `--dui-density-scale` | Density knob: `1` comfortable, `0` compact (`data-density`); in between interpolates, never below `0` | `factor-1` (1) |
| `--dui-opacity-disabled` | Disabled controls, `disabled` and `aria-disabled="true"` | `opacity-60` (0.6) |
| `--dui-tint-amount` | How much of a tone goes into a tinted surface | `mix-8` (8%) |
| `--dui-border-tint-amount` | How much of the text color goes into a tinted border (badges) | `mix-35` (35%) |
| `--dui-color-accent-text` | Accent as text (links, quiet buttons, accent badges). Relative color of `--dui-color-accent` | light: `oklch(47% 0.19 272)`<br>dark: `oklch(78% 0.11 272)` |
| `--dui-color-link` | Links | `--dui-color-accent-text` |
| `--dui-color-focus` | Focus ring (3:1 against surfaces) | light: `--dui-color-accent`<br>dark: `--dui-color-accent-text` |
| `--dui-color-accent-hover` | Accent solid hover | `oklch(from --dui-color-accent)` with lightness 0.02 lower |
| `--dui-color-primary-hover` | Primary fill hover | light: `oklch(32% 0.014 265)`<br>dark: `oklch(86% 0.008 265)`, hue from `--dui-color-primary` |
| `--dui-font-heading` | Heading font stack | `--dui-font-body` |
| `--dui-color-accent-surface` | Accent badge background | `color-mix()` of `--dui-tint-amount` `--dui-color-accent` into `--dui-color-surface` |
| `--dui-color-success-surface` | Success badge background | same, with `--dui-color-success` |
| `--dui-color-warning-surface` | Warning badge background | same, with `--dui-color-warning` |
| `--dui-color-danger-surface` | Danger badge and alert background | same, with `--dui-color-danger` |
| `--dui-color-info-surface` | Info alert background | same, with `--dui-color-info` |
| `--dui-color-surface-inverse` | Tooltip background | `--dui-color-text` |
| `--dui-color-text-inverse` | Tooltip text | `--dui-color-surface` |
| `--dui-motion-duration-fast` | Hover, press, switch, popovers and menus | `duration-120` (120ms) × `--dui-motion-scale` × `--dui-motion-enabled` |
| `--dui-motion-duration-normal` | Dialogs and toasts | `duration-200` (200ms) × `--dui-motion-scale` × `--dui-motion-enabled` |
| `--dui-motion-duration-slow` | The drawer | `duration-300` (300ms) × `--dui-motion-scale` × `--dui-motion-enabled` |
| `--dui-motion-distance` | How far a dialog or toast lifts as it fades in | `space-4` (0.75rem) × `--dui-motion-movement` |
| `--dui-motion-zoom` | Scale a popover or menu grows from | 0.95, or 1 when `--dui-motion-movement` is 0 |
| `--dui-motion-press-scale` | Scale of a pressed (`:active`) button | 0.98, or 1 when `--dui-motion-movement` is 0 |
| `--dui-elevation-shadow-color` | Shadow color after strength | `color-mix()` of `--dui-color-shadow` at `--dui-elevation-strength` |
| `--dui-elevation-ring` | The 1px ring in the hairline color that every elevated level includes | `0 0 0 1px` `--dui-color-border` |
| `--dui-elevation-highlight` | Dark scheme only: a 1px top inset highlight on levels 2 to 4 | `inset 0 1px 0 0`, transparent in light, the dark text color at 6% in dark |
| `--dui-size-control` | Min block size of controls, buttons and check labels | `--dui-size-target` (36px), `--dui-size-target-compact` (32px) when compact; 44px under `pointer: coarse` |
| `--dui-size-row` | Min block size of nav, menu, listbox, combobox option and list-detail items | `--dui-size-target-row` (32px), `--dui-size-target-row-compact` (28px) when compact; 44px under `pointer: coarse` |
| `--dui-space-control-block` | Block padding of controls, buttons and items | `space-3` (0.5rem), `space-2` (0.25rem) when compact |
| `--dui-space-control-inline` | Inline padding of text fields and items | `space-4` (0.75rem), `space-3` (0.5rem) when compact |
| `--dui-space-button-inline` | Inline padding of buttons and tabs | `space-5` (1rem), `space-4` (0.75rem) when compact |
| `--dui-space-gap` | Gap between the parts of a control (icon and label, check and label) | `space-3` (0.5rem), `space-2` (0.25rem) when compact |
| `--dui-space-gap-tight` | Gap and padding in groups of controls: field, toolbar, pagination, menu | `space-2` (0.25rem), `space-1` (0.125rem) when compact |
| `--dui-space-cell` | Table cell padding | `space-3` (0.5rem), `space-2` (0.25rem) when compact |
| `--dui-elevation-0` … `--dui-elevation-4` | Shadow per level | `none`; level 1 is the ring and `0 1px 2px -1px`; levels 2 to 4 add the dark highlight, the ring and two layers with a negative spread |
| `--dui-elevation-0-surface` … `--dui-elevation-4-surface` | Surface per level | light: `--dui-color-surface`<br>dark: `--dui-color-surface` with N × `--dui-elevation-surface-step` of `--dui-color-text` |
| `--dui-elevation-flat`, `-raised`, `-overlay`, `-popover`, `-dialog` | Shadow by role | levels 0, 1, 2, 3, 4 |
| `--dui-elevation-flat-surface`, `-raised-surface`, `-overlay-surface`, `-popover-surface`, `-dialog-surface` | Surface by role | level 0 to 4 surfaces |
| `--dui-elevation-panel` | Shadow of floating panels: app shell sidebars, the docs sidebar and table of contents | `--dui-elevation-2` |
| `--dui-elevation-panel-surface` | Surface of floating panels | `--dui-color-surface-raised` |
| `--dui-shadow-raised` | **Deprecated**, removed in the next release: use `--dui-elevation-raised` | `--dui-elevation-1` |
| `--dui-duration-fast` | **Deprecated**, removed in the next release | `--dui-motion-duration-fast` |
| `--dui-duration-normal` | **Deprecated**, removed in the next release | `--dui-motion-duration-normal` |
| `--dui-easing-standard` | **Deprecated**, removed in the next release | `--dui-motion-easing-standard` |

Derived (re-resolved on each theme scope and on every `[data-motion]` and `[data-density]` element): `--dui-color-accent-text`, `--dui-color-link`,
`--dui-color-focus`, `--dui-color-accent-hover`, `--dui-color-primary-hover`, `--dui-font-heading`, `--dui-color-accent-surface`,
`--dui-color-success-surface`, `--dui-color-warning-surface`, `--dui-color-danger-surface`,
`--dui-color-info-surface`, `--dui-color-surface-inverse`, `--dui-color-text-inverse`, `--dui-radius-control`, `--dui-radius-surface`, every
`--dui-motion-duration-*`, `--dui-motion-distance`, `--dui-motion-zoom`, `--dui-motion-press-scale`, every `--dui-elevation-*`
except the two knobs, the eight density tokens (`--dui-size-control`, `--dui-size-row` and the `--dui-space-control-*`,
`-button-inline`, `-gap*` and `-cell` spaces), and the deprecated aliases.

### Density

`data-density="compact"` on any element tightens every component inside it; `data-density="comfortable"`
is the default and restores it inside a compact area. Density changes space only: control heights
(36px to 32px), row heights (32px to 28px), padding, gaps and table cells. Text size never changes, and every target stays at least
24 by 24 CSS pixels ([2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).

- The attribute sets one knob, `--dui-density-scale` (`1` comfortable, `0` compact). Components read the
  density tokens above, each derived from the knob between its comfortable and compact value, and
  re-declared on every `[data-density]` element like the theme tokens, so nesting works both ways.
- Comfortable values point at other semantic tokens (`--dui-size-target`, the space scale), so a theme
  that changes those moves density with it. `small` and `large` buttons keep their sizes at every density.
- **Our choice:** an attribute on any ancestor, not a media query, because density follows the task (a data
  table, a toolbar), not the device, and one page often mixes both.
- **Our choice:** no [`zoom`](https://developer.mozilla.org/en-US/docs/Web/CSS/zoom) or font-size scaling,
  because both shrink text against the user's text size and scale targets below 24px.

[`examples/patterns/density.html`](examples/patterns/density.html) shows the same form, table and toolbar at
both densities side by side; [`explainers/density.md`](explainers/density.md) has the full contract.

## 6. Motion

Motion is CSS-first, token-driven and close to platform behavior: short fades, a drawer that
slides from its edge, popovers and menus that grow a little as they appear, and color changes on
buttons, links and the switch. Nothing waits on a transition to work.

- **Transitions only, no keyframe animations.** Every component uses
  [`transition`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition). Dialogs, drawers and
  popovers animate in and out of the top layer with
  [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) and
  [`transition-behavior: allow-discrete`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior)
  ([CSS Transitions 2](https://drafts.csswg.org/css-transitions-2/#transition-behavior-property)).
  An engine without them opens and closes the element with no transition.
- **Tokens drive every duration and easing.** `--dui-motion-duration-fast`, `-normal` and `-slow`
  are primitives times `--dui-motion-scale` (default `1`), so one value on `:root` makes all motion
  slower (`2`) or off (`0`). Easings: `--dui-motion-easing-standard` for state changes,
  `--dui-motion-easing-enter` for things arriving, `--dui-motion-easing-exit` for things leaving, and
  `--dui-motion-easing-spring` for popover, menu and drawer entrances: a critically damped spring written with
  [`linear()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/linear), set only
  inside `@supports`, so an engine without `linear()` keeps the enter curve.
- **Movement is a separate knob.** `--dui-motion-movement` is `1` by default. Distances
  (`--dui-motion-distance`, `--dui-motion-zoom`, `--dui-motion-press-scale`, the drawer's off-screen offset) and the duration of
  every [`translate`](https://developer.mozilla.org/en-US/docs/Web/CSS/translate) or
  [`scale`](https://developer.mozilla.org/en-US/docs/Web/CSS/scale) transition are multiplied by it.
- **Reduced motion keeps fades and drops movement.** Under
  [`prefers-reduced-motion: reduce`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
  ([Media Queries 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)) movement becomes `0`:
  the drawer fades in place, popovers fade without growing, the switch thumb jumps while its color
  still fades. This is what [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
  asks for: motion animation triggered by interaction can be disabled. **Our choice:** keep opacity
  and color transitions under reduced motion, because a fade is not motion animation and it still
  shows where a change came from.
- **`data-motion` on any element.** `data-motion="reduced"` behaves exactly like the media query for
  everything inside; `data-motion="none"` sets `--dui-motion-enabled` to `0`, so every duration is `0s`
  even where a `--dui-motion-scale` is set inside it. An empty `data-motion` is a scope
  for your own `--dui-motion-*` overrides: motion tokens are re-declared on it, as theme tokens are on
  `[data-theme]` ([CSS Variables](https://www.w3.org/TR/css-variables-1/#cycles)).
  **Our choice:** no `data-motion="full"`, so a page can never override a user's reduced-motion setting.
- **Essential feedback never animates.** Focus indicators, validation errors and `aria-invalid`,
  alert and live-region text, and loading state (`aria-busy`) change at once. **Our choice:** text
  fields do not animate their border at all, because the same border shows the invalid state.
- **View transitions are progressive enhancement only.** domestic-ui starts none and nothing depends on
  one. When your script calls `document.startViewTransition()`
  ([View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API),
  [CSS View Transitions](https://drafts.csswg.org/css-view-transitions-1/)), the base layer gives its
  pseudo-elements the motion tokens inside `@supports`, so they follow the scale and reduced motion too.

| Transition | Components | Duration | Moves |
| --- | --- | --- | --- |
| Fade and lift | Dialog, toast | `--dui-motion-duration-normal` | `translate` by `--dui-motion-distance` |
| Slide and fade | Drawer | `--dui-motion-duration-slow`, spring | `translate` by 100% of its width |
| Scale and fade | Popover, menu | `--dui-motion-duration-fast`, spring | `scale` from `--dui-motion-zoom` |
| Color | Buttons, links, switch track | `--dui-motion-duration-fast` | No |
| Press | Buttons (`:active`) | `--dui-motion-duration-fast` | `scale` to `--dui-motion-press-scale` (0.98) |
| Thumb slide | Switch | `--dui-motion-duration-fast` | `translate` |

**Our choice:** 120, 200 and 300ms, longer for larger surfaces, with a decelerating (or spring) enter and an
accelerating exit, because short transitions keep the UI responsive and the curves match how things
arrive and leave. [`examples/motion.html`](examples/motion.html) shows each transition, the scale, and reduced
and no-motion scopes side by side.

## 7. Elevation

Elevation says which layer is on top. Five levels, each a
[`box-shadow`](https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow) paired with a surface color:

| Level | Role token | Used by |
| --- | --- | --- |
| `--dui-elevation-0` | `--dui-elevation-flat` | The page and content on it |
| `--dui-elevation-1` | `--dui-elevation-raised` | Cards |
| `--dui-elevation-2` | `--dui-elevation-overlay` | Toasts |
| `--dui-elevation-3` | `--dui-elevation-popover` | Popovers, menus, tooltips, nav dropdowns |
| `--dui-elevation-4` | `--dui-elevation-dialog` | Dialogs and drawers |
| `--dui-elevation-2` | `--dui-elevation-panel` | Floating sidebars and side panels, on `--dui-elevation-panel-surface` (the raised surface) |

Each has a `-surface` twin (`--dui-elevation-2-surface`, `--dui-elevation-overlay-surface`).
**Components use the role tokens only**, never the numbers, so a theme can move a role to another level.

- **A ring plus soft layers.** Every level from 1 up is a 1px ring in the hairline color
  (`--dui-elevation-ring`) plus one or two layers with a negative spread, at 12% alpha or less in
  light: level 1 is `0 1px 2px -1px`; level 2 `0 2px 4px -2px` and `0 4px 12px -4px`; level 3
  `0 4px 8px -4px` and `0 12px 24px -8px`; level 4 `0 8px 16px -8px` and `0 24px 48px -12px`. The ring is
  part of the role, so **an elevated component draws no border of its own**; it keeps a transparent
  border for forced colors (below). Radix Themes builds its shadows the same way
  ([shadows](https://www.radix-ui.com/themes/docs/theme/shadows)), for comparison.
- **Light scheme: the shadow does the work.** Every level keeps `--dui-color-surface`; shadows grow
  with the level.
- **Dark scheme: lighter surfaces.** Shadows barely show on a dark page, so each level mixes
  `--dui-elevation-surface-step` more of the text color into the surface with
  [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
  ([CSS Color 5](https://www.w3.org/TR/css-color-5/#color-mix)), picked per scheme by
  [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark).
  Levels 2 to 4 add a 1px top inset highlight (`--dui-elevation-highlight`) in dark only, and the ring
  reads slightly brighter because the dark hairline is the light text color at low alpha.
  Text, muted text, links, control borders and the focus ring meet
  [4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and
  [3:1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) on every level, in light and
  dark, in the default and forest themes; `tests/tokens.spec.js` checks it.
- **Theme knobs.** `--dui-color-shadow` (shadow color), `--dui-elevation-strength` (0% to 100% of it) and
  `--dui-elevation-surface-step` (dark-scheme step per level). The levels are re-derived on every theme
  scope, like the other dependent tokens.
- **Forced colors: borders, not shadows.** In [forced colors mode](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
  `box-shadow` computes to `none` ([CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/#forced-colors-properties)),
  so every elevated component keeps a transparent border, which forced colors paints in a system
  color (`CanvasText`) there.
- **Floating panels.** `--dui-elevation-panel` and `--dui-elevation-panel-surface`, with
  `--dui-radius-surface` corners and `--dui-space-panel-inset` from the frame edge, are for sidebars
  that float on the page background instead of being glued to the viewport edge.
- **Our choice:** toasts sit at the overlay level, below popovers and dialogs, because they are
  non-modal and must not cover an open menu or dialog.
- **Our choice:** the dark-scheme step mixes in the text color rather than white, so a theme's tint
  carries into its raised surfaces.

`--dui-shadow-raised` is deprecated: it now points at `--dui-elevation-1` and is removed in the next
release. [`examples/elevation.html`](examples/elevation.html) shows every level in light and dark side by side.

## 8. Opinions we hold

Each of these is a choice between valid options, not a standard.

- **Our choice:** [logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
  (`margin-block`, `inline-size`), so right-to-left and vertical writing modes work unchanged.
- **Our choice:** keep link underlines, because color alone is not enough to spot a link (WCAG 1.4.1).
- **Our choice:** system font stacks from [Modern Font Stacks](https://modernfontstacks.com/),
  because they cost no network requests and match the platform.
- **Our choice:** a fluid type scale with [`clamp()`](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)
  in `rem`, so text grows with the viewport and still respects the user's font size.
- **Our choice:** a 65ch measure for prose, near the commonly cited 45 to 75 characters per line
  ([WCAG 1.4.8 Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html) asks for 80 or fewer).
- **Our choice:** rhythm from the "lobotomized owl" selector (`* + *`) inside flow containers
  ([Heydon Pickering](https://alistapart.com/article/axiomatic-css-and-lobotomized-owls/)), wrapped in
  `:where()` so it has zero specificity.
- **Our choice:** `type="submit"` buttons get the accent fill and other buttons stay neutral,
  so the primary action is marked by its native type, with no class.
- **Our choice:** checkboxes, radios and range keep native rendering tinted with
  [`accent-color`](https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color), because
  native controls keep their platform accessibility.
- **Our choice:** each atom has one `data-<atom>` attribute whose value is a space-separated
  list (`data-button="primary small"`), matched with `~=`, instead of modifier classes. The
  other atom choices (button variants, focus rings, switch, field errors, badge tints) are
  listed with their reasons in the [atoms index](css/components/atoms/README.md#our-choices).
- **Our choice:** molecules follow the same rule (`data-card="link"`, `data-dialog="drawer end"`),
  or use the native element or ARIA role when that already says everything (`<search>`,
  `role="toolbar"`). The molecule choices are listed with their reasons in the
  [molecules index](css/components/molecules/README.md#our-choices); the main ones:
  - **Our choice:** tabs select on focus (automatic activation), as the
    [APG recommends](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#deciding-when-to-make-selection-automatically-follow-focus)
    when panels show at once; `activation="manual"` is available.
  - **Our choice:** the drawer is a `<dialog>` variant, so the browser handles modality, focus and
    <kbd>Esc</kbd> ([explainer](explainers/drawer.md)).
  - **Our choice:** a clickable card links its heading and stretches that link over the card, so the
    accessible name stays the heading ([explainer](explainers/card.md)).
  - **Our choice:** toasts never dismiss themselves and never take focus ([explainer](explainers/toast.md)).
  - **Our choice:** the typeahead (`<dui-combobox>`) upgrades a native `<input list>` + `<datalist>`, not a
    `<select>`, because the value is free text and the upgrade reuses the same input and options. It
    follows the [APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) list autocomplete
    variant, filters by "contains" like the native
    [`<datalist>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist) popups
    in Chromium and Firefox, and positions its listbox under the input rather than in the top layer, so
    it is never wider than the field ([explainer](explainers/combobox.md)).
- **Our choice:** organisms (page header, filter bar, form sections, data table) follow the same one-attribute rule
  (`data-page-header`, `data-filter-bar`, `data-form-sections`, `data-table`) and take the rest of their layout from their
  children's native elements. Their choices are listed in the
  [organisms index](css/components/organisms/README.md#our-choices); the main ones:
  - **Our choice:** the filter bar is a `<form method="get">` in `<search>` with an Apply button and a
    `role="status"` result count present from page load, so filters live in the URL, work without
    JavaScript and are announced ([4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)).
  - **Our choice:** form sections are headed `<section>` elements with a `<header>` and one body of fields,
    not fieldsets, because a `<legend>` cannot be placed in a grid column; related controls still go in a
    `<fieldset>` inside the body.
  - **Our choice:** the data table (`data-table` on a native `<table>`) has sortable headers that are plain
    text in the markup; `<dui-table>` turns them into buttons and follows the
    [APG Sortable Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/) example
    (`aria-sort` on the sorted header only, a visually hidden caption hint, nothing else announced), so with
    JavaScript off there are no buttons that do nothing. A selected row shows a checked checkbox, a bar on its
    leading edge and a tint, never color alone; the count is a `role="status"` element present from load.
  - **Our choice:** a sticky table header sticks to the nearest scroll container, so a sticky table goes in
    `data-scroll="block inline"` (at most `--dui-size-pane` tall) or in none; numeric columns are marked per
    cell with the same attribute (`data-table="number"`), because words on the table cannot target a column.
- **Our choice:** layout primitives come from [Every Layout](https://every-layout.dev/)'s
  Stack, Cluster and Grid. Their custom properties are registered with
  [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) as non-inheriting,
  so a nested primitive keeps its own default.

### Links: visited state

[`:visited`](https://developer.mozilla.org/en-US/docs/Web/CSS/:visited) tells a reader which
destinations they have already seen. WCAG does not require it:
[Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) says conveying a
link's visited status "is not an author responsibility". The visited color still meets 4.5:1.

- **Our choice:** only content links take `--dui-color-link-visited`. Navigational links keep their
  unvisited color, because a reader picks a destination again on every page and "seen before" is noise
  there. Navigational means: inside a [`<nav>`](https://html.spec.whatwg.org/multipage/sections.html#the-nav-element)
  or `role="navigation"`, `menu`, `menubar`, `tablist` or `toolbar`; a `role="tab"` or `menuitem*` link;
  a link with `data-button`; or a same-page `#fragment` link (skip links, tables of contents).
- The base rule does this with `a:visited:not(:where(…))`, so it stays at the specificity of `a:visited`
  and needs no per-component resets. In forced colors, navigational links show `LinkText` and content
  links show `VisitedText`.
- **Either way:** mark a navigational link outside a `<nav>` with `data-link="nav"` (combines with
  `quiet`) to drop the visited color. For the rare content link inside a `<nav>`, set
  `color: var(--dui-color-link-visited)` on its `:visited` state in your own CSS, which beats the layers.

### Icons

- **Our choice:** [Lucide](https://lucide.dev) is the icon set, because its SVGs already use our 24px grid, 2px round
  `currentColor` stroke and need no build. Credit: Lucide is under the [ISC licence](https://lucide.dev/license); the
  icons it took from [Feather](https://github.com/feathericons/feather) are under the
  [MIT licence](https://github.com/feathericons/feather/blob/main/LICENSE). [Tabler](https://tabler.io/icons) and
  [Heroicons](https://heroicons.com) were the alternatives considered.
- **Our choice:** icons are inline SVG, copied from the official set into the markup. The repository ships no icon
  files, sprite, font or package. The recipe: copy the icon from lucide.dev, replace its `class` with
  [`data-icon`](css/components/atoms/icon.css), add `aria-hidden="true" focusable="false"`, keep everything else
  (`viewBox`, `fill="none"`, `stroke="currentColor"`, `width` and `height`) as Lucide ships it, and note the icon's name
  in a comment. `data-icon` sizes it to `--dui-size-icon` and keeps it from shrinking; the stroke follows the text color
  through [`currentColor`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#currentcolor), so it follows
  themes and [forced colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) with no extra CSS.

  [`examples/atoms/icon.html`](examples/atoms/icon.html) shows the recipe in every context.

- **Decorative or meaningful.** An icon beside a visible label is decoration: `aria-hidden="true"`, so the label is the
  name and is not announced twice ([1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)).
  A standalone icon that carries meaning, outside a control, is `role="img"` with a `<title>` (and `aria-labelledby`
  pointing at it). In a control, the name goes on the control, never on the SVG
  ([4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html),
  [APG: names and descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)).
- **Contrast.** An icon that is the only sign of a control or a state meets 3:1
  ([1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)); a selected state
  changes the drawing (filled or outlined), not only its color.
- **Our choice:** icon plus a visible label is the default. Label only is always fine, and better when no icon comes to
  mind at once. If the label is visible, the accessible name contains it
  ([2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)).
- **Our choice:** icon only (`data-button="icon"`) is allowed only for these widely recognized actions: search, close,
  open or close navigation (menu), play, pause, stop, skip, expand and collapse, back, forward, edit, more (overflow),
  settings in an app bar, and add item in a dense toolbar. A product-specific metaphor is never icon only. The button
  - is named for the action ("Search", "Close"), never the picture ("Magnifying glass", "X"), with visually hidden text
    inside it;
  - shows a visible tooltip with the same words on hover **and** keyboard focus, which <kbd>Esc</kbd> hides and the
    pointer can move onto ([1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)).
    The tooltip is `<dui-tooltip>` with a `popover="hint"`: no browser can show a popover on hover and focus without
    script except Chromium, through [`interestfor`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#interestfor),
    which Firefox and Safari do not support yet;
  - is a square of `--dui-size-control` (36px comfortable, 32px compact, 44px under a coarse pointer), never smaller than 24 by 24 pixels
    ([2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- **Our choice:** no icon-only destructive actions. Delete, remove, empty and reset always show their word; a trash icon
  may sit beside it. For that reason delete is not on the list above, even in a toolbar.
- **Our choice:** navigation keeps visible text. Icons in nav links and app bar buttons are decoration.
- **Our choice:** in right-to-left text, flip only icons whose meaning has a direction, with `data-icon="mirror"`
  (flipped under [`:dir(rtl)`](https://developer.mozilla.org/en-US/docs/Web/CSS/:dir), which follows the nearest `dir`
  attribute): arrows, chevrons, back and forward, undo and redo, indent and outdent, text alignment to the start or end.
  Never flip search, close, play, check, clocks or logos.
- **Icon fonts are rejected.** A ligature or private-use glyph is text: user text spacing
  ([1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)) can break the ligature into
  words, a font that fails to load shows letters or empty boxes, and screen readers may read the ligature name.

## 9. Layout primitives

| Class | What it does | Custom properties |
| --- | --- | --- |
| `.stack` | Vertical flow with a gap | `--stack-gap` |
| `.cluster` | Wrapping inline group | `--cluster-gap`, `--cluster-justify`, `--cluster-align` |
| `.grid` | Auto-fit responsive grid, no media queries | `--grid-min`, `--grid-gap` |
| `[data-scroll="inline"]` | Scroll container for content wider than the screen, such as a data table | None |
| `[data-scroll="block inline"]` | Also scrolls vertically, at most `--dui-size-pane` (the viewport) tall, so a sticky table header stays in view | None |

```html
<div class="grid" style="--grid-min: 12rem">…</div>
```

On a `ul` or `ol`, the primitive also removes list markers and padding.

### Page layouts

Larger layouts for application screens, each one attribute on a wrapper, live in `css/layout/` too and
are shown in [`examples/layouts/`](examples/layouts/index.html):

| Attribute | What it does |
| --- | --- |
| `data-list-detail` | A list of links (`aria-current` on the selected one) beside a labelled detail; the detail scrolls on its own when side by side |
| `data-split="[1:1 \| 1:2 \| 2:1]"` | Two regions side by side at a ratio |
| `data-dashboard`, `data-dashboard="wide \| full"` on a tile | Headed tiles on raised surfaces that reflow without media queries |
| `data-action-bar` | A form's buttons in a bar that sticks to the bottom of the scroll area and never hides the focused field |
| `data-app-shell`, `data-app-shell="contained"` | The frame of an application: `<header>`, a primary sidebar (`<nav>`), `<main>`, an optional auxiliary `<aside>` and `<footer>` in named grid areas; `<dui-app-shell>` makes the sidebars collapsible and drawers when narrow |

Each one is side by side when its wrapper is wide and stacked when it is narrow, from 320px up, and keeps
source order (the reading and Tab order) in both. A settings page needs no API of its own: it is a
`data-list-detail` of in-page links beside `data-form-sections` with a `data-action-bar`
([example](examples/layouts/settings.html)).

- **Our choice:** layouts and [organisms](css/components/organisms/README.md) switch with a
  [container query](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
  on their own wrapper, not a media query, because they sit in regions of any width: a page, a split, the
  main area of an app shell. Media queries are kept for decisions about the whole viewport. A container
  query condition cannot read a custom property, so each breakpoint is a length written in the file header.
- **Our choice:** list-detail items are links to the item's own URL, not buttons that swap content, so
  history, bookmarks and the no-JavaScript case work.
- **Our choice:** the sticky action bar reserves its height as `scroll-padding-block-end` on every ancestor
  of its form, so whichever one scrolls keeps the focused field clear of the bar
  ([2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html),
  technique [C43](https://www.w3.org/WAI/WCAG22/Techniques/css/C43)).
- **Our choice:** the app shell is the landmarks HTML already has, in source order, placed with
  `grid-template-areas`; parts are recognized by element and position, so none needs an attribute
  ([APG Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/),
  [explainer](explainers/app-shell.md)). Without JavaScript both sidebars are always shown (stacked when narrow)
  and the toggles stay `hidden`, so no button does nothing.
- **Our choice:** one copy of each sidebar. Beside main it is a plain landmark that its toggle hides with
  `hidden`; on a narrow shell `<dui-app-shell>` moves the same element into a modal drawer `<dialog>` while the
  drawer is open, so screen readers hear "dialog" only while it is one and the navigation is never duplicated.
- **Our choice:** the shell switches on its own width (container queries at 48rem for the primary sidebar
  and 64rem for the auxiliary one, and a `ResizeObserver` in the element), and `<main>` and each sidebar are
  named size containers, so a contained shell works anywhere and the layouts inside main follow main's width.
- **Our choice:** the sidebar navigation is the nav molecule (`data-nav="vertical"`) with optional decorative
  icons, not a tree view: an [APG Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) is for
  hierarchies users navigate as data (file trees) with roving focus and arrow keys; site navigation is links,
  so disclosure groups and links ([APG Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/))
  are the right semantics.
- **Our choice:** the selected item of a list-detail is marked like a selected table row: a
  `--dui-border-width-emphasis` bar on its leading edge, a tint and bold text, with the bar drawn in
  `Highlight` in forced colors mode ([1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html),
  [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- **Our choice:** splits have a fixed ratio and no draggable divider; a resizable one would follow the
  [APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) pattern
  ([explainer](explainers/split-view.md)).

Wrap any table that may not fit a 320px screen in `data-scroll="inline"`, named by its caption:

```html
<section data-scroll="inline" aria-labelledby="orders-caption" tabindex="0">
  <table>
    <caption id="orders-caption">Recent orders</caption>
    …
  </table>
</section>
```

`tabindex="0"` makes it scrollable from the keyboard
([2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), axe
[`scrollable-region-focusable`](https://dequeuniversity.com/rules/axe/4.10/scrollable-region-focusable)),
and a named `<section>` is a [region landmark](https://www.w3.org/TR/html-aam-1.0/#el-section), so
screen reader users hear what that focus stop is. **Our choice:** `<section>` rather than
`<div role="region">`, because the native element already has the role. Data tables
may scroll sideways under [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html);
the page itself must not. Never set `display: block` on the `<table>` instead: it can drop table
semantics in some browsers ([Adrian Roselli](https://adrianroselli.com/2018/02/tables-css-display-properties-and-aria.html)).
A `<pre>` already scrolls (`overflow-x: auto`); authors MUST give every `<pre>` (and any
`data-scroll="inline"` container) `tabindex="0"` so it can be scrolled from the keyboard.

## 10. Web components

HTML still has no element for tabs, menus, roving focus in a toolbar, hover tooltips or a toast
stack. For those, and only those, [`web-components/`](web-components/README.md) has one small
custom element each: `<dui-tabs>`, `<dui-menu>`, `<dui-combobox>`, `<dui-toolbar>`, `<dui-tooltip>`,
`<dui-toaster>`, `<dui-table>` (sorting rows and selecting them, which a `<table>` cannot do) and `<dui-app-shell>`
(collapsing sidebars and turning them into modal drawers on a narrow shell, which a button cannot do by itself). HTML does have `<datalist>`, but its popup cannot be styled and differs between engines,
so `<dui-combobox>` upgrades it to a listbox the page owns.

- **Light DOM.** No shadow root: the molecule CSS and your CSS style the markup directly.
- **Progressive enhancement.** The markup works before the script runs and with JavaScript off:
  tabs are a `<nav>` of in-page links and headed sections, toolbar buttons are Tab stops, a menu's
  popover still opens, a tooltip is still the button's description, a data table keeps the server's order
  with plain-text headers and ordinary checkboxes, an app shell shows both sidebars and no toggles.
- **ARIA with behavior, or not at all.** An element adds roles such as `menu` or `tab` only together
  with the keyboard support those roles promise ([APG](https://www.w3.org/WAI/ARIA/apg/)).
- **Why each exists** is written at the top of its file, and the
  [web components index](web-components/README.md) lists them. Each one is a plain ES module with no
  dependencies and no build: `<script type="module" src="web-components/dui-tabs.js"></script>`.

## 11. Explainers

A pattern with no native element and no APG pattern is written up like a platform proposal in
[`explainers/`](explainers/README.md): problem, use cases, goals and non-goals, markup and API,
keyboard, accessibility mappings, alternatives, prior art and open questions, with normative
text in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) keywords. The card, pagination, drawer
and toast molecules have one, and so do density, the combobox, the split view, the app shell and
its auxiliary sidebar, which record the choices their
standards leave open. Names follow HTML and ARIA conventions, so a pattern could map onto
a future native element or attribute.

## 12. Tooling

`npm test` runs, in order, and fails if any step fails:

| Script | Tool | Checks |
| --- | --- | --- |
| `lint:html` | [html-validate](https://html-validate.org/) | `examples/**/*.html` against `html-validate:recommended` |
| `lint:css` | [Stylelint](https://stylelint.io/) | `css/**/*.css` against `stylelint-config-standard` |
| `lint:tokens` | `scripts/check-tokens.mjs` | Semantic-only tokens and no literal colors or sizes outside `css/tokens/` |
| `test:a11y` | [Playwright](https://playwright.dev/) + [axe-core](https://github.com/dequelabs/axe-core) | Every `examples/**/*.html` (atoms and molecules included) in light and dark, in Chromium, Firefox and WebKit, with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, including open dialogs and drawers, open popovers and menus, shown tooltips and toasts, every tab selected and every details expanded; no horizontal page overflow and no axe violations at 320×640 and 375×812; no external requests; token contrast pairs (atoms and molecules included) in the default and forest themes; rendered focus-ring and indicator contrast; atom and molecule states through accessibility APIs; molecule keyboard behavior against the APG; no-JavaScript fallbacks; fallbacks for engine-specific features; scoped theming of atoms and molecules; layouts and organisms side by side when wide and stacked when narrow, the sticky action bar never covering the focused field, data table sorting, selection, sticky header and loading state (with and without JavaScript), and 24px targets in compact density; the app shell's landmarks and grid areas, collapse when wide, modal drawers with focus return when narrow, one copy of each sidebar, no-JavaScript fallbacks and axe with the drawers open |

Preview locally with `npm run serve` (a zero-dependency static server) and open
<http://127.0.0.1:4173/examples/base.html>. To run tests from two checkouts at once, give each its own port, e.g. `PORT=4273 npm test`.

Rule relaxations, each with its reason:

- **Stylelint `custom-property-pattern`** is replaced, not disabled. The standard kebab-case
  pattern rejects `--dui-step--1` (the double hyphen marks a negative step, a common naming for
  type scales below zero). The replacement still requires kebab-case and only allows names
  starting with `--dui-` or the documented layout properties (`--stack-*`, `--cluster-*`, `--grid-*`).
- **Engine-specific test**: the field test also reads the `invalid` state from the accessibility
  tree through the Chrome DevTools Protocol, which only Chromium offers; Firefox and WebKit run the
  rest of that test (attribute and accessible description). The molecule tests do the same for the
  expanded state of `<summary>` and of a `popovertarget` button, which browsers expose natively but
  Playwright's role engine does not compute; the other engines check the `open` attribute and the
  popover's visibility instead. No browser is skipped.
- **Feature fallbacks**: where every engine in the test run supports a feature (anchor positioning,
  `@starting-style`, `closedby`, `popover="hint"`), the molecule tests also exercise the fallback path
  by removing the feature in the page: deleting the `@supports` or `@starting-style` rules from the
  CSSOM, removing the `closedby` attribute, or setting `popover="manual"` (what `hint` falls back to).
- **Settling transitions**: axe and geometry checks wait for running CSS transitions to finish, so they
  measure final colors and positions rather than a frame mid-fade.
- **External-request check**: same-origin `blob:` URLs are allowed, because WebKit routes these
  in-memory objects through the request handler. Any other origin still fails the test.
- **html-validate**: none. `html-validate:recommended` is used as-is. Inline `style` attributes
  that set only custom properties are already allowed by its
  [`no-inline-style`](https://html-validate.org/rules/no-inline-style.html) default
  (`allowVariables: true`), which is how the layout primitives are configured.

## 13. Edges and alignment

**Our choice:** every container has a few named vertical lines, written in tokens, and every item sits on one of them
or has a written reason, because edges picked by eye drift by a few pixels per panel and nobody can say which was meant.
No web standard covers this. The method is prior art, not a spec: Karri Saarinen's redraw of the Linear sidebar
([How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)) and the
[Apple Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout),
as packaged by the [gridlines](https://github.com/pritamux/gridlines) skill. Standards win any conflict:
[2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), focus outlines
and forced-colors borders are never reduced to close a gap; the gap is left and written down.

- **Box line and text line.** Boxed rows and controls (nav links, menu items, list rows, tabs, table rows, buttons)
  put their box on the container's content edge and their label one control padding in. **Our choice:** the box never
  hangs outside its container (the skill's "pull the strip in" for tabs), because a hit area or focus ring past the
  edge is clipped by scroll containers and goes off screen in a container with no padding.
- **Icons on one column, labels on one line.** In a list, every row's icon starts on the same column and every
  label on the same line, whatever sits before them (an indicator bar, a disclosure marker).
- **Bars centre on one line.** Items in a toolbar, app bar, dialog header or page header title row are centred on one
  horizontal line (`align-items: center`); the first item starts on the box line, the last ends on the trailing line.
- Lines use `--dui-space-*` and the other semantic tokens with logical properties (`padding-inline-start`), never px.
  A line that needs a value off the scale means the container's padding is wrong.

The lines, measured from each container's inline-start edge (the trailing line mirrors the leading one unless noted):

| Container | Box line | Text line | Other lines |
| --- | --- | --- | --- |
| App shell frame: `<header>`, sidebars, `<footer>` | `--dui-space-m` | box line + the control's `--dui-space-button-inline` (app bar), or the nav's lines below | Trailing: `--dui-space-m`. Each frame region measures from its own edge |
| App shell `<main>` | `--dui-space-l` beside a sidebar, `--dui-space-m` stacked | same as box line | |
| Nav list (`data-nav="vertical"`) | the list's edge; a group's links `--dui-space-m` in | `--dui-border-width-indicator` + `--dui-space-control-inline`, plus `--dui-space-m` for links beside a group (the disclosure marker's width) and inside one | Icon column: starts on the text line, `--dui-size-icon` wide, then `--dui-space-gap` to the label |
| Toolbar (`role="toolbar"`) | `--dui-border-width` + `--dui-space-gap-tight` | box line + `--dui-space-button-inline` | One centre line |
| Menus and popovers | menu items: `--dui-border-width` + `--dui-space-gap-tight` | `--dui-border-width` + `--dui-space-m` (a menu: `--dui-space-gap-tight` + `--dui-space-control-inline`, equal at comfortable density) | A horizontal nav's dropdown adds its `--dui-border-width-indicator` |
| Tabs | the tab list's edge | box line + `--dui-space-button-inline` | Panel text on the tab list's edge |
| Dialogs and drawers | `--dui-border-width` + `--dui-space-l` | same as box line | Header title and close button share a centre line; footer actions end on the trailing line |
| List-detail | list rows on the list's edge | rows: `--dui-border-width-emphasis` + `--dui-space-control-inline`; detail: `--dui-focus-width` + `--dui-focus-offset` side by side (room for focus rings), its edge when stacked | |
| Data table | rows on the table's edge; the caption on it too | `--dui-space-cell` | Checkbox column: one centre line; body rows' `--dui-border-width-emphasis` bar is matched by the header cell's padding. Number columns end on `--dui-space-cell` |
| Page header (`data-page-header`) | the region's edge | same as box line | Actions end on the trailing line (the edge); title and actions share a centre line |

These were read from the CSS in an alignment pass on 21 November 2026 (Owen Donckers, with Claude), taking the line
most rows already used. [`CONTRIBUTING.md`](CONTRIBUTING.md#alignment-passes) explains how to run a pass.
