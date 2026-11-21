---
title: Breadcrumb
summary: The path to the current page: an ordered list of links in a labelled `<nav>`.
milestone: M3
level: molecule
standard: APG Breadcrumb pattern: https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/
specs:
  - HTML `<nav>` element: https://html.spec.whatwg.org/multipage/sections.html#the-nav-element
  - MDN `aria-current`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current
---
- [`aria-current="page"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current) marks the current page, which is also bold ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- Separators use CSS [alternative text](https://developer.mozilla.org/en-US/docs/Web/CSS/content#alternative_text) `""`, so they are not read.
- Links are at least 24px tall ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
