---
title: Card
summary: A self-contained item, such as an article teaser, on a raised surface.
milestone: M3
level: molecule
our-choice: No standard exists: an `<article>` whose heading holds the one link, so the link name stays short.
specs:
  - HTML `<article>` element: https://html.spec.whatwg.org/multipage/sections.html#the-article-element
---
- Every card has a heading. Use `<article>` when it stands on its own.
- Images need `alt`, or `alt=""` when decorative.
- `data-card="link"` stretches the heading's link over the card, so the link name is the heading ([Inclusive Components](https://inclusive-components.design/cards/)). Footer actions stay focusable; card text cannot be selected with the mouse.
