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
