---
title: Theming
order: 1
summary: A theme is an override of semantic tokens, on `:root` for the whole page or on any element with `data-theme`.
principle: theming
tokens:
  - semantic: Surfaces and text
  - semantic: Borders
  - semantic: Accent and status
  - semantic: Dependent tokens
---
Start from the forest theme below: a `<style>` block that sets a handful of semantic color tokens on
`[data-theme="forest"]`. Tokens that derive from others (links, focus, hover, tinted surfaces) follow
on their own. Check the contrast of every pair in both color schemes; `tests/tokens.spec.js` shows how.
