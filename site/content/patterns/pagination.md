---
title: Pagination
summary: Links to the pages of a long list of results.
milestone: M3
level: molecule
our-choice: No standard exists: a labelled `<nav>` with a list of links and `aria-current="page"`, as for breadcrumbs.
specs:
  - HTML `<nav>` element: https://html.spec.whatwg.org/multipage/sections.html#the-nav-element
  - MDN `aria-current`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current
---
- A visually hidden "Page" completes each number's link name ([WCAG 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)).
- At the ends, Previous or Next is an `<a>` with no `href`: not focusable.
- **Our choice:** the current page stays a link with `aria-current="page"`, so the list count stays stable.
