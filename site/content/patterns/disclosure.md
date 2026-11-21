---
title: Disclosure
summary: A summary that shows or hides more content, built on `<details>` and `<summary>`.
milestone: M3
level: molecule
standard:
  - HTML `<details>` element: https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element
  - APG Disclosure pattern: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
keyboard:
  - Enter / Space: on the summary, shows or hides the content.
---
- `<summary>` is a button with `aria-expanded` ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-summary)); no ARIA to write.
- Unlike the [APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/), headers are not headings and have no arrow keys; both are optional there.
- Avoid exclusive groups ([`name`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details#name)) when people compare sections.
