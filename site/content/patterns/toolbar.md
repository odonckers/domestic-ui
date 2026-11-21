---
title: Toolbar
summary: A row of related controls that is one stop in the tab order.
milestone: M3
level: molecule
standard: APG Toolbar pattern: https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
keyboard:
  - Tab / Shift+Tab: moves focus into and out of the toolbar.
  - Left Arrow / Right Arrow: moves focus to the previous or next control.
  - Home / End: moves focus to the first or last control.
---
- Use a toolbar for three or more controls. Without JavaScript, each control is a Tab stop.
- Toggle buttons use [`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-pressed), shown by more than color ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
