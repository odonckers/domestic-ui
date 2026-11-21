---
title: Site navigation
summary: The main links of a site in a `<nav>` landmark, with the current page marked.
milestone: M3
level: organism
standard:
  - HTML `<nav>` element: https://html.spec.whatwg.org/multipage/sections.html#the-nav-element
  - APG Landmark regions: https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
  - APG Disclosure navigation example: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
specs:
  - MDN `aria-current`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current
---
- Native `<details>` in place of the [APG disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/); not an ARIA menu.
- [`aria-current="page"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current) is shown with a bar, a tint and bold text ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- Give each `<nav>` a distinct `aria-label` when there are several.
- Groups do not close on <kbd>Esc</kbd>; <kbd>Enter</kbd> on the summary does.
