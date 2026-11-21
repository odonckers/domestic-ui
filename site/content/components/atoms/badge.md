---
usage:
  - Static text. To make a badge clickable, put a real `<button>` or `<a href>` around it.
  - An empty value is neutral.
---
- The words carry the meaning, not the tone ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)); add "Status:" with `.visually-hidden` if only position gives context.
- Text on each tone has 4.5:1 contrast ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)), checked by `npm test`.
