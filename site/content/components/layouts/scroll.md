---
summary: A scroll container for content wider than the screen, such as a data table, so it scrolls on its own instead of widening the page.
usage:
  - Add `tabindex="0"` so keyboard users can scroll it ([WCAG 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [axe rule](https://dequeuniversity.com/rules/axe/4.10/scrollable-region-focusable)).
  - **Our choice:** a `<section>` with `aria-labelledby`, not `<div role="region">`, because the native element already has the role.
  - A table inside keeps `display: table`, or it can lose its semantics ([Adrian Roselli](https://adrianroselli.com/2018/02/tables-css-display-properties-and-aria.html)).
---
- [WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) allows two-dimensional scrolling for data tables.
- A named `<section>` is a region landmark ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-section)), so the focus stop is announced.
