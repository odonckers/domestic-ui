# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Semantic token names and file paths under `css/` are public API; primitive tokens are not.

## [Unreleased]

### Added

- `css/domestic.css`: zero-build entry point declaring
  `@layer reset, tokens, base, layout, components, utilities;` and importing each layer file.
- `reset` layer: a modest modern reset (`css/reset/reset.css`).
- `tokens` layer: primitive tokens (`css/tokens/primitives.css`) and semantic tokens
  (`css/tokens/semantic.css`), all prefixed `--dui-`, with `light-dark()` colors,
  a fluid `clamp()` type scale, spacing, radii, focus and motion tokens that collapse
  under `prefers-reduced-motion`.
- Theme scoping with `[data-theme]` or `.theme-*`, and scheme forcing with
  `data-color-scheme="light" | "dark"`.
- `base` layer: styles for text, links, lists, quotes, code, media, tables, form controls,
  buttons, `<dialog>`, `<details>`, visible `:focus-visible` and forced-colors support.
- `layout` layer: `.stack`, `.cluster` and `.grid` primitives configured with custom properties.
- `utilities` layer: `.visually-hidden`.
- Placeholders for `css/components/` and `web-components/`.
- `examples/base.html` and `examples/theming.html`.
- `PRINCIPLES.md`, including the semantic token reference.
- Tooling: html-validate, Stylelint, a token discipline check, and Playwright + axe-core
  accessibility tests in light and dark, all run by `npm test`.
- GitHub Actions: CI on pull requests and pushes to `main`, and a GitHub Pages skeleton.
- Atoms in `css/components/atoms/`, imported into the `components` layer, each with one attribute API:
  - Text helpers: `data-text="lead | small | muted"`.
  - Quiet link: `data-link="quiet"` (inherits text color, keeps its underline).
  - Buttons: `data-button="[primary | secondary | quiet] [small | large]"` on `<button>`, `<input>`
    and `<a href>`; `aria-disabled="true"` and `aria-busy="true"` states; an inner focus ring on
    primary buttons. `type="submit"` stays primary by default.
  - Switch: `role="switch"` on `<input type="checkbox">`, per the APG Switch pattern, with
    forced-colors support.
  - Field: `data-field` with `data-field="hint"` and `data-field="error"`; invalid style for
    `aria-invalid="true"` and `:user-invalid`.
  - Badge: `data-badge="neutral | accent | success | warning | danger"`.
- Semantic tokens: `--dui-color-warning`, `--dui-color-accent-surface`, `--dui-color-success-surface`,
  `--dui-color-warning-surface`, `--dui-color-danger-surface`, `--dui-tint-amount`, `--dui-border-tint-amount`,
  `--dui-size-target-small`, `--dui-size-target-large` (and their primitives).
- `examples/atoms/`: an index and one page per atom; the theming example now shows atoms in both themes.
- Tests: atom states through Playwright accessibility APIs, rendered focus-ring contrast on every
  button variant, contrast pairs for every new token, and scoped theming of atoms.
- Firefox and WebKit Playwright projects alongside Chromium, installed in CI.
- `layout` layer: `data-scroll="inline"` (`css/layout/scroll.css`), a keyboard-focusable scroll
  container for wide content such as data tables, used on a `<section>` named by the table caption (a region landmark).
- Tests: `tests/mobile.spec.js` checks every example at 320×640 and 375×812 in Chromium, Firefox
  and WebKit for horizontal page overflow and axe violations.
- Molecules in `css/components/molecules/`, imported into the `components` layer after the atoms,
  each documented in its file header (API, example, keyboard, specs) and indexed in
  `css/components/molecules/README.md`:
  - Disclosure and accordion (`disclosure.css`): native `<details>`/`<summary>`, exclusive groups with
    `name`; `data-disclosure="accordion | plain"`.
  - Dialog and drawer (`dialog.css`): header/body/footer layout and open transition for `<dialog>`;
    `data-dialog="drawer [start | end]"`; invoker commands and `closedby`; `@starting-style` with a
    no-transition fallback.
  - Popover and tooltip (`popover.css`): `data-popover="[block-start | inline-start | inline-end]"`,
    anchored with CSS anchor positioning inside `@supports` (bottom-center fallback); tooltips are
    `role="tooltip"` on `popover="hint"`.
  - Navigation list (`nav.css`): `data-nav="vertical | horizontal"`, `aria-current="page"`, `<details>` groups.
  - Breadcrumb (`breadcrumb.css`): `data-breadcrumb`, separators with empty alternative text.
  - Tabs (`tabs.css`): styles for `role="tablist" | "tab" | "tabpanel"`.
  - Menu button (`menu-button.css`): items of a `<dui-menu>` popover.
  - Toolbar (`toolbar.css`): `role="toolbar"`, `aria-orientation`, `aria-pressed` toggles.
  - Pagination (`pagination.css`): `data-pagination`, `aria-current="page"`, placeholder links for disabled ends.
  - Search field (`search.css`): the native `<search>` element around a search form.
  - Card (`card.css`): `data-card` and `data-card="link"` (heading link stretched over the card).
  - Alert and toast (`alerts.css`): `data-alert="info | success | warning | danger"` with a text prefix and
    an icon; `data-alert="toasts"` region; live region guidance.
- Web components in `web-components/`, light DOM, progressive enhancement, no dependencies:
  `<dui-tabs>` (APG Tabs from in-page links and sections; `aria-current="true"` on the link selected on
  load, swapped for `aria-selected` on upgrade; automatic or manual activation; RTL),
  `<dui-menu>` (APG Menu Button keyboard on a popover), `<dui-toolbar>` (roving tabindex),
  `<dui-tooltip>` (show on hover and focus, Esc to hide; stands in for `interestfor`) and
  `<dui-toaster>` (`show()` and `dismiss()` for a toast region, no auto-dismiss).
- Explainers in `explainers/` for the custom patterns: card, pagination, drawer and toast, plus an index.
- Semantic tokens: `--dui-color-info`, `--dui-color-info-surface`, `--dui-color-surface-inverse`,
  `--dui-color-text-inverse`, `--dui-border-width-indicator`, `--dui-size-menu-min`, `--dui-size-drawer`
  (and primitives `--dui-border-3`, `--dui-size-12`, `--dui-size-24`).
- `examples/molecules/`: an index and one page per molecule; the theming example now shows a breadcrumb,
  an alert, tabs and a card in both themes; "Molecules" links in the example navigation.
- Tests (`tests/molecules.spec.js` and additions to the existing specs): APG keyboard behavior for tabs,
  menu button, toolbar, dialog and drawer, popover, tooltip, disclosure and nav groups; ARIA states through
  accessibility APIs; no-JavaScript fallbacks; fallback paths for anchor positioning, `@starting-style`,
  `closedby` and `popover="hint"`; rendered indicator and focus-ring contrast; contrast pairs for every new
  token; scoped theming of molecules. The axe test now also checks open popovers and menus, every tab,
  shown tooltips and toasts, and waits for transitions to finish.
- `PRINCIPLES.md`: molecule choices, new semantic tokens, and "Web components" and "Explainers" sections.
- Motion tokens: `--dui-motion-scale` (multiplies every duration), `--dui-motion-movement` (1 lets things
  slide, lift and zoom; 0 keeps fades only), `--dui-motion-enabled` (0 under `data-motion="none"`),
  `--dui-motion-duration-fast | normal | slow`, `--dui-motion-easing-standard | enter | exit`,
  `--dui-motion-distance` and `--dui-motion-zoom`; new primitives `--dui-duration-350`,
  `--dui-easing-decelerate`, `--dui-easing-accelerate`, `--dui-factor-0`, `--dui-factor-1` and `--dui-ratio-95`.
- `data-motion="reduced"` (same as `prefers-reduced-motion: reduce`) and `data-motion="none"` (every
  duration `0s`) on any element; an empty `data-motion` scopes your own `--dui-motion-*` overrides.
- View transitions started by your own script use the motion tokens (inside `@supports`); domestic-ui
  starts none.
- Elevation scale: `--dui-elevation-0` to `--dui-elevation-4` (shadows) and `--dui-elevation-0-surface` to
  `--dui-elevation-4-surface` (lighter tonal surfaces in the dark scheme via `light-dark()` and
  `color-mix()`), role tokens `--dui-elevation-flat | raised | overlay | popover | dialog` and their
  `-surface` twins, and theme knobs `--dui-elevation-shadow-color`, `--dui-elevation-strength` and
  `--dui-elevation-surface-step`; new shadow-geometry primitives `--dui-shadow-1-key` … `--dui-shadow-4-ambient`,
  `--dui-shadow-none`, `--dui-mix-3` and `--dui-mix-100`.
- `examples/motion.html` and `examples/elevation.html`, linked from the example navigation, with docs pages
  `principles/motion.html` and `principles/elevation.html`.
- `PRINCIPLES.md`: "Motion" and "Elevation" sections (later sections renumbered) and the new semantic tokens.
- Tests (`tests/motion-elevation.spec.js` and additions to `tests/tokens.spec.js`): every element on every
  example page has `0s` transition and animation durations under `data-motion="none"`, with dialogs,
  drawers, popovers, menus, details and toasts open; reduced motion (media query and `data-motion="reduced"`)
  has no movement transition but keeps the fades; `--dui-motion-scale` multiplies durations on a
  descendant scope; axe on the new pages; contrast of text, muted text, links, control borders and the
  focus ring on every elevation surface in light and dark, default and forest themes; borders in forced
  colors; `--dui-shadow-raised` equals level 1.
- Combobox (typeahead) molecule: `<dui-combobox>` (`web-components/dui-combobox.js`) upgrades a native
  `<input list>` + `<datalist>` to the APG Combobox list autocomplete pattern (`role="combobox"`,
  `aria-expanded`, `aria-controls`, `aria-activedescendant`, a `role="listbox"` built from the datalist
  options), keeping the same input; case-insensitive "contains" filtering; a polite `role="status"` result
  count; a cancelable `dui-combobox-filter` event and `setOptions()` for options loaded by the page;
  `change` on the input when an option is accepted. Styles in `css/components/molecules/combobox.css`
  (popover elevation, fade and zoom with the motion tokens, forced colors). `examples/molecules/combobox.html`,
  `explainers/combobox.md`; the typeahead docs page now shows it live.
- Density: `data-density="compact"` on any element tightens control heights (44px to 32px), padding, gaps and
  table cells inside it, with the same text size and every target at least 24 by 24 CSS pixels;
  `data-density="comfortable"` (the default) restores them. Semantic tokens `--dui-density-scale` (the knob),
  `--dui-size-control`, `--dui-space-control-block`, `--dui-space-control-inline`, `--dui-space-button-inline`,
  `--dui-space-gap`, `--dui-space-gap-tight` and `--dui-space-cell`, re-derived on every `[data-density]`
  scope. `examples/patterns/density.html` (linked from the example navigation), `explainers/density.md`;
  the density docs page now shows it live.
- `--dui-size-page`: the max inline size of a page's content column, `72rem` (primitive `--dui-size-72`).
- Tests: `tests/combobox.spec.js` (APG keyboard and ARIA, filtering, live region, filter event and
  `setOptions()`, form submission, no-JavaScript fallback, axe with the list open, 320px, motion) and
  `tests/density.spec.js` (compact vs comfortable computed sizes, 24px targets, unchanged font sizes,
  nested scopes, `--dui-size-page`). The axe and `data-motion="none"` checks now also open every combobox.

### Changed

- Examples use `max-inline-size: var(--dui-size-page)` instead of a hard-coded `72rem`.
- Components read the density tokens instead of `--dui-size-target` and fixed spaces: text fields, selects,
  textareas, color inputs, check and switch labels, buttons and `a[data-button]`, `<summary>`, table
  cells, field gaps, tabs, nav, menu, pagination and toolbar. Values are unchanged at the default
  (comfortable) density.
- The molecules index no longer lists the combobox under "Not shipped".

- Components adopt the motion and elevation tokens: card uses the raised level (shadow added, surface
  `--dui-elevation-raised-surface`), popovers, menus, tooltips and nav dropdowns the popover level, toasts
  the overlay level, dialogs and drawers the dialog level (including the sticky drawer header). No
  component uses a literal duration, easing or shadow.
- Reduced motion now keeps opacity and color transitions and drops movement, instead of setting every
  duration to `0s`. Popovers and menus also grow from `--dui-motion-zoom`; drawers fade as they slide (and
  only fade with reduced motion); enter and exit use their own easings.
- Text fields no longer animate their border, so the invalid state shows at once.
- Smooth in-page scrolling is also off under `data-motion="reduced" | "none"` on the root.

- CI: lint, html-validate, the token check and `node site/build.mjs --check` run as a `lint` job, and the
  Playwright suite is split across eight shards (`--shard=i/8`) in the Playwright container. A final job
  named `ci` passes only when all of them pass, so the required check keeps its name.

### Deprecated

- `--dui-shadow-raised` (now `var(--dui-elevation-1)`; use `--dui-elevation-raised`),
  `--dui-duration-fast` (use `--dui-motion-duration-fast`), `--dui-duration-normal` (use
  `--dui-motion-duration-normal`) and `--dui-easing-standard` (use `--dui-motion-easing-standard`). Each is
  an alias of its replacement and is removed in the next release.

### Fixed

- Pages no longer scroll sideways on small screens (320px and up). Inline `code`, `kbd`, `samp`
  and links in running text wrap with `overflow-wrap: anywhere`, long words in headings break,
  `.cluster` and `.grid` children get `min-inline-size: 0`, badges wrap (a wrapped badge keeps
  rounded corners), table cells use `--dui-space-xs` padding on every side, and every example
  table sits in a `data-scroll="inline"` region. Every example `<pre>` block (in
  `examples/base.html`, `examples/theming.html` and `examples/atoms/`) now has `tabindex="0"`
  and is keyboard-focusable (axe `scrollable-region-focusable`).

- Base button hover and press styles no longer apply to buttons with `aria-disabled="true"`.

[Unreleased]: https://github.com/odonckers/domestic-ui/commits/main
