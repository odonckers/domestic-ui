---
title: Popover
summary: Content shown on top of the page from a button, with the `popover` attribute.
milestone: M3
level: molecule
standard:
  - HTML `popover` attribute: https://html.spec.whatwg.org/multipage/popover.html#the-popover-attribute
  - MDN Popover API: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
keyboard:
  - Enter / Space: on the invoking button, shows or hides the popover.
  - Escape: closes an `auto` popover.
---
- A popover does not trap focus; decisions belong in a modal `<dialog>`. For actions, use the [menu button](site:patterns/menu-button.html).
- A tooltip supplements the trigger's name, shows on focus and hover, and closes on <kbd>Esc</kbd> ([WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html); [APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) is a draft).
