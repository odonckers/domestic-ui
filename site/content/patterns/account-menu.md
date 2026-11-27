---
title: Account menu
summary: The signed-in person's name and email, links to their account pages and a sign-out button, in a popover.
milestone: M3b
level: molecule
standard: APG Disclosure pattern: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
our-choice: A disclosure, not an ARIA menu: the items are links and one form button, so a `data-popover` holding a `<nav>` keeps Tab order and link semantics; the popover lines its other children up with the links.
sources:
  - compositions.html
specs:
  - HTML popover attribute: https://html.spec.whatwg.org/multipage/popover.html
---
- Links that go to other pages are not a menu ([menu button](menu-button.html) explains when a menu fits). Tab moves through the links and the sign-out button.
- Sign out is a form that posts, not a link, so following or prefetching a link never signs anyone out ([HTTP semantics, safe methods](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.1)).
- The button's name is the person's name, so it reads as whose account this is.
