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
  inline, short, and commented.
- **Our choice:** class and attribute APIs over custom elements, because they work with
  any templating language and need no JavaScript.

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
| Target size | Controls are at least 44px tall, above the 24px minimum | [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| Reduced motion | Duration tokens become `0s` under `prefers-reduced-motion: reduce` | [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) |
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
| `layout` | `.stack`, `.cluster`, `.grid` |
| `components` | Molecules and organisms (M2, M3; empty for now) |
| `utilities` | Single-purpose helpers such as `.visually-hidden`; last so they always apply |

**Our choice:** this order, because each layer only refines the ones before it, and a
utility should beat a component the way an inline override would.

## 5. Theming

### Two tiers of tokens

All tokens are [custom properties](https://www.w3.org/TR/css-variables-1/) on `:root`
with the `--dui-` prefix.

| Tier | File | Named by | Example | Public? |
| --- | --- | --- | --- | --- |
| Primitive | `css/tokens/primitives.css` | What it is | `--dui-color-blue-600: #3451d1;` `--dui-space-5: 1rem;` | No. Internal, may change in any release. |
| Semantic | `css/tokens/semantic.css` | What it is for | `--dui-color-accent: light-dark(var(--dui-color-blue-600), var(--dui-color-blue-400));` | **Yes.** The stable theming API. |

**Base, layout, utility and component CSS reference only semantic tokens.** They never use
primitives and never hard-code colors or sizes (`0`, `1px` hairlines, percentages, `fr`,
`currentcolor`, `inherit`, `transparent` and system colors are fine). `npm test` enforces
this with `scripts/check-tokens.mjs` (`npm run lint:tokens`), which also rejects literal
colors in `semantic.css`.

**Our choice:** the `--dui-` prefix, so tokens never collide with your own custom properties.

### A theme is a semantic-token override

No build step. Override semantic tokens on `:root` for the whole page, or on any element
with a `data-theme` attribute or a `theme-*` class to scope it:

```css
[data-theme="forest"] {
  --dui-color-surface: light-dark(#f7f5ef, #141a16);
  --dui-color-text: light-dark(#1d2a22, #e4ebe3);
  --dui-color-accent: light-dark(#2f6b3f, #7fcf95);
  --dui-color-accent-contrast: light-dark(#fff, #0f1a13);
}
```

```html
<section data-theme="forest">…</section>
```

[`examples/theming.html`](examples/theming.html) shows a full scoped theme next to the default.
Check your theme's contrast in both schemes; `tests/tokens.spec.js` shows how.

A few semantic tokens are defined in terms of others (`--dui-color-link`, `--dui-color-focus`
and `--dui-color-accent-hover` follow `--dui-color-accent`). A custom property's `var()` is
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
| `--dui-color-surface` | Page and control background | light: `color-gray-0` (#fff)<br>dark: `color-gray-900` (#12151b) |
| `--dui-color-surface-raised` | Slightly lifted areas: neutral buttons, zebra rows, cards | light: `color-gray-50` (#f6f7f9)<br>dark: `color-gray-850` (#1b1f27) |
| `--dui-color-surface-sunken` | Recessed areas: code, button hover | light: `color-gray-100` (#eceef2)<br>dark: `color-gray-800` (#252a34) |
| `--dui-color-text` | Body text | light: `color-gray-900` (#12151b)<br>dark: `color-gray-100` (#eceef2) |
| `--dui-color-text-muted` | Secondary text, captions, list markers (still 4.5:1) | light: `color-gray-600` (#545b68)<br>dark: `color-gray-400` (#a3aab6) |
| `--dui-color-border` | Decorative hairlines: tables, hr, details, fieldset | light: `color-gray-200` (#dde0e6)<br>dark: `color-gray-700` (#3a404b) |
| `--dui-color-border-control` | Form control and button boundaries (3:1) | light: `color-gray-500` (#7a8291)<br>dark: `color-gray-500` (#7a8291) |
| `--dui-color-accent` | Brand color: primary button fill, checks, links and focus by default | light: `color-blue-600` (#3451d1)<br>dark: `color-blue-400` (#8ea2ff) |
| `--dui-color-accent-contrast` | Text on accent | light: `color-gray-0` (#fff)<br>dark: `color-gray-900` (#12151b) |
| `--dui-color-link-visited` | Visited links | light: `color-purple-700` (#6b2fb3)<br>dark: `color-purple-300` (#d2a8ff) |
| `--dui-color-danger` | Errors, :user-invalid borders | light: `color-red-700` (#b42318)<br>dark: `color-red-300` (#ff8a80) |
| `--dui-color-success` | Success messages | light: `color-green-700` (#17773a)<br>dark: `color-green-300` (#5fd38d) |
| `--dui-color-mark` | mark and ::selection background | light: `color-yellow-100` (#fff1a8)<br>dark: `color-yellow-300` (#e3c84f) |
| `--dui-color-mark-text` | Text on mark | light: `color-gray-900` (#12151b)<br>dark: `color-gray-900` (#12151b) |
| `--dui-color-backdrop` | dialog::backdrop | light: `color-black-a40` (rgb(0 0 0 / 40%))<br>dark: `color-black-a60` (rgb(0 0 0 / 60%)) |
| `--dui-color-shadow` | Shadow color | light: `color-black-a10` (rgb(0 0 0 / 10%))<br>dark: `color-black-a40` (rgb(0 0 0 / 40%)) |
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
| `--dui-size-target` | Min height of controls and buttons (WCAG 2.5.8 needs 24px; this gives 44px) | `size-2-75` (2.75rem) |
| `--dui-size-check` | Checkbox and radio size | `size-1-25` (1.25rem) |
| `--dui-size-column-min` | Default .grid min column width | `size-16` (16rem) |
| `--dui-radius-control` | Controls, buttons, inline code | `radius-2` (0.375rem) |
| `--dui-radius-surface` | Panels, pre, dialog, details, media | `radius-3` (0.625rem) |
| `--dui-radius-pill` | Fully rounded ends | `radius-round` (999rem) |
| `--dui-border-width` | Hairline width | `border-1` (1px) |
| `--dui-border-width-emphasis` | blockquote rule | `border-4` (0.25rem) |
| `--dui-underline-offset` | Link underline offset | `underline-offset-015em` (0.15em) |
| `--dui-underline-thickness` | Link underline | `underline-1` (0.0625em) |
| `--dui-underline-thickness-hover` | Link underline on hover | `underline-2` (0.125em) |
| `--dui-focus-width` | Focus outline width | `border-2` (2px) |
| `--dui-focus-offset` | Focus outline offset | `border-2` (2px) |
| `--dui-duration-fast` | Hover transitions (0s with reduced motion) | `duration-150` (150ms) |
| `--dui-duration-normal` | Larger transitions (0s with reduced motion) | `duration-250` (250ms) |
| `--dui-easing-standard` | Easing curve (linear with reduced motion) | `--dui-easing-ease-out` |
| `--dui-opacity-disabled` | Disabled controls | `opacity-60` (0.6) |
| `--dui-color-link` | Links | `--dui-color-accent` |
| `--dui-color-focus` | Focus ring (3:1 against surfaces) | `--dui-color-accent` |
| `--dui-color-accent-hover` | Primary button hover | `color-mix()` of 82% `--dui-color-accent` with `--dui-color-text` |
| `--dui-font-heading` | Heading font stack | `--dui-font-body` |
| `--dui-shadow-raised` | dialog shadow | two-layer shadow using `--dui-color-shadow` |

Derived (re-resolved on each theme scope): `--dui-color-link`, `--dui-color-focus`,
`--dui-color-accent-hover`, `--dui-font-heading`, `--dui-shadow-raised`.

## 6. Opinions we hold

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
- **Our choice:** layout primitives come from [Every Layout](https://every-layout.dev/)'s
  Stack, Cluster and Grid. Their custom properties are registered with
  [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) as non-inheriting,
  so a nested primitive keeps its own default.

## 7. Layout primitives

| Class | What it does | Custom properties |
| --- | --- | --- |
| `.stack` | Vertical flow with a gap | `--stack-gap` |
| `.cluster` | Wrapping inline group | `--cluster-gap`, `--cluster-justify`, `--cluster-align` |
| `.grid` | Auto-fit responsive grid, no media queries | `--grid-min`, `--grid-gap` |

```html
<div class="grid" style="--grid-min: 12rem">…</div>
```

On a `ul` or `ol`, the primitive also removes list markers and padding.

## 8. Tooling

`npm test` runs, in order, and fails if any step fails:

| Script | Tool | Checks |
| --- | --- | --- |
| `lint:html` | [html-validate](https://html-validate.org/) | `examples/**/*.html` against `html-validate:recommended` |
| `lint:css` | [Stylelint](https://stylelint.io/) | `css/**/*.css` against `stylelint-config-standard` |
| `lint:tokens` | `scripts/check-tokens.mjs` | Semantic-only tokens and no literal colors or sizes outside `css/tokens/` |
| `test:a11y` | [Playwright](https://playwright.dev/) + [axe-core](https://github.com/dequelabs/axe-core) | Every `examples/*.html` in light and dark with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, including open dialogs and details; no external requests; token contrast pairs; scoped theming |

Preview locally with `npm run serve` (a zero-dependency static server) and open
<http://127.0.0.1:4173/examples/base.html>.

Rule relaxations, each with its reason:

- **Stylelint `custom-property-pattern`** is replaced, not disabled. The standard kebab-case
  pattern rejects `--dui-step--1` (the double hyphen marks a negative step, a common naming for
  type scales below zero). The replacement still requires kebab-case and only allows names
  starting with `--dui-` or the documented layout properties (`--stack-*`, `--cluster-*`, `--grid-*`).
- **html-validate**: none. `html-validate:recommended` is used as-is. Inline `style` attributes
  that set only custom properties are already allowed by its
  [`no-inline-style`](https://html-validate.org/rules/no-inline-style.html) default
  (`allowVariables: true`), which is how the layout primitives are configured.
