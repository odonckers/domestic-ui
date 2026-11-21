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
