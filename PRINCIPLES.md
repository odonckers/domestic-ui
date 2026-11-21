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
| Target size | Controls are at least 44px tall, above the 24px minimum | [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
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
| `layout` | `.stack`, `.cluster`, `.grid`, `[data-scroll]` |
| `components` | Atoms in `css/components/atoms/` (M2) and molecules in `css/components/molecules/` (M3a); organisms later. See the [atoms index](css/components/atoms/README.md) and the [molecules index](css/components/molecules/README.md) |
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
and `--dui-color-accent-hover` follow `--dui-color-accent`; the badge tints
`--dui-color-*-surface` mix a tone into `--dui-color-surface`). A custom property's `var()` is
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
| `--dui-color-warning` | Warning badges and messages | light: `color-amber-700` (#8a5a00)<br>dark: `color-amber-300` (#f2c14e) |
| `--dui-color-info` | Informational alerts and toasts (separate from the accent, so a brand color never reads as a status) | light: `color-blue-700` (#2b43b0)<br>dark: `color-blue-300` (#a8b7ff) |
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
| `--dui-size-target-small` | Small buttons (32px: under 44px, over the 24px minimum) | `size-2` (2rem) |
| `--dui-size-target-large` | Large buttons | `size-3-25` (3.25rem) |
| `--dui-size-check` | Checkbox and radio size | `size-1-25` (1.25rem) |
| `--dui-size-column-min` | Default .grid min column width | `size-16` (16rem) |
| `--dui-size-menu-min` | Min width of menus and nav dropdowns | `size-12` (12rem) |
| `--dui-size-drawer` | Drawer width (all of the viewport when narrower) | `size-24` (24rem) |
| `--dui-radius-control` | Controls, buttons, inline code | `radius-2` (0.375rem) |
| `--dui-radius-surface` | Panels, pre, dialog, details, media | `radius-3` (0.625rem) |
| `--dui-radius-pill` | Fully rounded ends | `radius-round` (999rem) |
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
| `--dui-elevation-strength` | How much of `--dui-color-shadow` each shadow uses (0% to 100%) | `mix-100` (100%) |
| `--dui-elevation-surface-step` | Dark scheme: text color mixed into the surface per level | `mix-3` (3%) |
| `--dui-opacity-disabled` | Disabled controls, `disabled` and `aria-disabled="true"` | `opacity-60` (0.6) |
| `--dui-tint-amount` | How much of a tone goes into a tinted surface | `mix-8` (8%) |
| `--dui-border-tint-amount` | How much of the text color goes into a tinted border (badges) | `mix-35` (35%) |
| `--dui-color-link` | Links | `--dui-color-accent` |
| `--dui-color-focus` | Focus ring (3:1 against surfaces) | `--dui-color-accent` |
| `--dui-color-accent-hover` | Primary button hover | `color-mix()` of 82% `--dui-color-accent` with `--dui-color-text` |
| `--dui-font-heading` | Heading font stack | `--dui-font-body` |
| `--dui-color-accent-surface` | Accent badge background | `color-mix()` of `--dui-tint-amount` `--dui-color-accent` into `--dui-color-surface` |
| `--dui-color-success-surface` | Success badge background | same, with `--dui-color-success` |
| `--dui-color-warning-surface` | Warning badge background | same, with `--dui-color-warning` |
| `--dui-color-danger-surface` | Danger badge and alert background | same, with `--dui-color-danger` |
| `--dui-color-info-surface` | Info alert background | same, with `--dui-color-info` |
| `--dui-color-surface-inverse` | Tooltip background | `--dui-color-text` |
| `--dui-color-text-inverse` | Tooltip text | `--dui-color-surface` |
| `--dui-motion-duration-fast` | Hover, press, switch, popovers and menus | `duration-150` (150ms) × `--dui-motion-scale` × `--dui-motion-enabled` |
| `--dui-motion-duration-normal` | Dialogs and toasts | `duration-250` (250ms) × `--dui-motion-scale` × `--dui-motion-enabled` |
| `--dui-motion-duration-slow` | The drawer | `duration-350` (350ms) × `--dui-motion-scale` × `--dui-motion-enabled` |
| `--dui-motion-distance` | How far a dialog or toast lifts as it fades in | `space-4` (0.75rem) × `--dui-motion-movement` |
| `--dui-motion-zoom` | Scale a popover or menu grows from | 0.95, or 1 when `--dui-motion-movement` is 0 |
| `--dui-elevation-shadow-color` | Shadow color after strength | `color-mix()` of `--dui-color-shadow` at `--dui-elevation-strength` |
| `--dui-elevation-0` … `--dui-elevation-4` | Shadow per level | `none`, then two layers (key and ambient) growing with the level |
| `--dui-elevation-0-surface` … `--dui-elevation-4-surface` | Surface per level | light: `--dui-color-surface`<br>dark: `--dui-color-surface` with N × `--dui-elevation-surface-step` of `--dui-color-text` |
| `--dui-elevation-flat`, `-raised`, `-overlay`, `-popover`, `-dialog` | Shadow by role | levels 0, 1, 2, 3, 4 |
| `--dui-elevation-flat-surface`, `-raised-surface`, `-overlay-surface`, `-popover-surface`, `-dialog-surface` | Surface by role | level 0 to 4 surfaces |
| `--dui-shadow-raised` | **Deprecated**, removed in the next release: use `--dui-elevation-raised` | `--dui-elevation-1` |
| `--dui-duration-fast` | **Deprecated**, removed in the next release | `--dui-motion-duration-fast` |
| `--dui-duration-normal` | **Deprecated**, removed in the next release | `--dui-motion-duration-normal` |
| `--dui-easing-standard` | **Deprecated**, removed in the next release | `--dui-motion-easing-standard` |

Derived (re-resolved on each theme scope and on every `[data-motion]` element): `--dui-color-link`,
`--dui-color-focus`, `--dui-color-accent-hover`, `--dui-font-heading`, `--dui-color-accent-surface`,
`--dui-color-success-surface`, `--dui-color-warning-surface`, `--dui-color-danger-surface`,
`--dui-color-info-surface`, `--dui-color-surface-inverse`, `--dui-color-text-inverse`, every
`--dui-motion-duration-*`, `--dui-motion-distance`, `--dui-motion-zoom`, every `--dui-elevation-*`
except the two knobs, and the deprecated aliases.

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
  `--dui-motion-easing-enter` for things arriving, `--dui-motion-easing-exit` for things leaving.
- **Movement is a separate knob.** `--dui-motion-movement` is `1` by default. Distances
  (`--dui-motion-distance`, `--dui-motion-zoom`, the drawer's off-screen offset) and the duration of
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
| Slide and fade | Drawer | `--dui-motion-duration-slow` | `translate` by 100% of its width |
| Scale and fade | Popover, menu | `--dui-motion-duration-fast` | `scale` from `--dui-motion-zoom` |
| Color | Buttons, links, switch track | `--dui-motion-duration-fast` | No |
| Thumb slide | Switch | `--dui-motion-duration-fast` | `translate` |

**Our choice:** 150, 250 and 350ms, longer for larger surfaces, with a decelerating enter and an
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

Each has a `-surface` twin (`--dui-elevation-2-surface`, `--dui-elevation-overlay-surface`).
**Components use the role tokens only**, never the numbers, so a theme can move a role to another level.

- **Light scheme: the shadow does the work.** Every level keeps `--dui-color-surface`; shadows grow
  with the level (a tight key shadow and a wide ambient one).
- **Dark scheme: lighter surfaces.** Shadows barely show on a dark page, so each level mixes
  `--dui-elevation-surface-step` more of the text color into the surface with
  [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
  ([CSS Color 5](https://www.w3.org/TR/css-color-5/#color-mix)), picked per scheme by
  [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark).
  Text, muted text, links, control borders and the focus ring meet
  [4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and
  [3:1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) on every level, in light and
  dark, in the default and forest themes; `tests/tokens.spec.js` checks it.
- **Theme knobs.** `--dui-color-shadow` (shadow color), `--dui-elevation-strength` (0% to 100% of it) and
  `--dui-elevation-surface-step` (dark-scheme step per level). The levels are re-derived on every theme
  scope, like the other dependent tokens.
- **Forced colors: borders, not shadows.** In [forced colors mode](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
  `box-shadow` computes to `none` ([CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/#forced-colors-properties)),
  so every elevated component keeps a border, drawn in `CanvasText` there.
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
- **Our choice:** layout primitives come from [Every Layout](https://every-layout.dev/)'s
  Stack, Cluster and Grid. Their custom properties are registered with
  [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) as non-inheriting,
  so a nested primitive keeps its own default.

## 9. Layout primitives

| Class | What it does | Custom properties |
| --- | --- | --- |
| `.stack` | Vertical flow with a gap | `--stack-gap` |
| `.cluster` | Wrapping inline group | `--cluster-gap`, `--cluster-justify`, `--cluster-align` |
| `.grid` | Auto-fit responsive grid, no media queries | `--grid-min`, `--grid-gap` |
| `[data-scroll="inline"]` | Scroll container for content wider than the screen, such as a data table | None |

```html
<div class="grid" style="--grid-min: 12rem">…</div>
```

On a `ul` or `ol`, the primitive also removes list markers and padding.

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
custom element each: `<dui-tabs>`, `<dui-menu>`, `<dui-toolbar>`, `<dui-tooltip>` and `<dui-toaster>`.

- **Light DOM.** No shadow root: the molecule CSS and your CSS style the markup directly.
- **Progressive enhancement.** The markup works before the script runs and with JavaScript off:
  tabs are a `<nav>` of in-page links and headed sections, toolbar buttons are Tab stops, a menu's
  popover still opens, a tooltip is still the button's description.
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
and toast molecules have one. Names follow HTML and ARIA conventions, so a pattern could map onto
a future native element or attribute.

## 12. Tooling

`npm test` runs, in order, and fails if any step fails:

| Script | Tool | Checks |
| --- | --- | --- |
| `lint:html` | [html-validate](https://html-validate.org/) | `examples/**/*.html` against `html-validate:recommended` |
| `lint:css` | [Stylelint](https://stylelint.io/) | `css/**/*.css` against `stylelint-config-standard` |
| `lint:tokens` | `scripts/check-tokens.mjs` | Semantic-only tokens and no literal colors or sizes outside `css/tokens/` |
| `test:a11y` | [Playwright](https://playwright.dev/) + [axe-core](https://github.com/dequelabs/axe-core) | Every `examples/**/*.html` (atoms and molecules included) in light and dark, in Chromium, Firefox and WebKit, with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, including open dialogs and drawers, open popovers and menus, shown tooltips and toasts, every tab selected and every details expanded; no horizontal page overflow and no axe violations at 320×640 and 375×812; no external requests; token contrast pairs (atoms and molecules included) in the default and forest themes; rendered focus-ring and indicator contrast; atom and molecule states through accessibility APIs; molecule keyboard behavior against the APG; no-JavaScript fallbacks; fallbacks for engine-specific features; scoped theming of atoms and molecules |

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
