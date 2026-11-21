---
title: Alerts
summary: Status messages, from notices in the page to live alerts and toasts.
milestone: M3
level: molecule
standard: APG Alert pattern: https://www.w3.org/WAI/ARIA/apg/patterns/alert/
specs:
  - WCAG 4.1.3 Status Messages: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
  - MDN `status` role: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role
---
- New messages are announced without moving focus ([WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)): `role="status"` is polite, `role="alert"` interrupts. Static alerts need no role.
- Render the empty live region with the page and insert the text later ([ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), [ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19)).
- Start the message with a word such as "Warning:", so tone is not color alone ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- **Our choice:** toasts never dismiss themselves or take focus, so nobody loses a message ([WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)).
