---
title: Notifications list
summary: Recent events, newest first, each a linked sentence with the time it happened.
milestone: M3b
level: molecule
our-choice: A composition, not a component: a `data-card` section holding an ordered `.stack` list, each item one paragraph with a link and a small muted `<time>`.
sources:
  - compositions.html
specs:
  - HTML `<ol>` element: https://html.spec.whatwg.org/multipage/grouping-content.html#the-ol-element
  - HTML `<time>` element: https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-time-element
  - WCAG 2.4.4 Link Purpose (In Context): https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html
---
- An ordered list, because the order (newest first) means something.
- Each link says what happened, so it makes sense out of context ([WCAG 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)). `<time datetime>` gives the machine-readable moment.
- A notification that arrives while the page is open is a status message: announce it with a [toast](alerts.html), and add it to this list.
