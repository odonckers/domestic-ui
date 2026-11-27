---
title: Stat row
summary: A row of headline numbers, each a small card with a label, the value and a note.
milestone: M3b
level: organism
our-choice: A composition, not a component: a `.grid` of `data-card` articles, each a muted heading, a lead paragraph with the number in `<strong>` and a small note.
sources:
  - compositions.html
specs:
  - HTML `<article>` element: https://html.spec.whatwg.org/multipage/sections.html#the-article-element
  - WCAG 1.3.1 Info and Relationships: https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html
---
- Each stat is a card with its label as the heading, so screen reader users can move between stats by heading.
- Write the change in words ("Up 20% on last month"), not only as a colour or an arrow ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- The row reflows from four columns to one without media queries; for a page of headed sections use the [dashboard](dashboard.html) instead.
