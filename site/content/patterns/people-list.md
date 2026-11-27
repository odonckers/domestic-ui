---
title: People list
summary: A list of people, each with a name, an email and a role badge at the end of the row.
milestone: M3b
level: molecule
our-choice: A composition, not a component: a `.stack` list whose items are `.cluster` rows with `--cluster-justify: space-between`, the name in `<strong>` above a small muted email.
sources:
  - compositions.html
specs:
  - HTML `<ul>` element: https://html.spec.whatwg.org/multipage/grouping-content.html#the-ul-element
  - WCAG 1.4.1 Use of Color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
---
- The role is text in a badge, never a colour alone ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- When people need sorting, filtering or bulk actions, use a [data table](data-table.html) instead.
