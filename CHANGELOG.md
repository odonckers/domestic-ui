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
