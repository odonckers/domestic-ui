---
title: Search
summary: A search form in a `<search>` landmark with an `<input type="search">`.
milestone: M3
level: molecule
standard:
  - HTML `<search>` element: https://html.spec.whatwg.org/multipage/grouping-content.html#the-search-element
  - MDN `<input type="search">`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/search
specs:
  - MDN `<search>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/search
---
- `<search>` is a landmark; label it only when there are several.
- The input needs a `<label>`, visually hidden if space is short; a placeholder is not a label ([WCAG 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)).
