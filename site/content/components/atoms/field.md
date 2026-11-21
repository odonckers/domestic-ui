---
usage:
  - The wrapper is a `<div>`, or a `<fieldset>` for a group of controls.
  - Hide an error that does not apply with `hidden`, and remove its id from `aria-describedby`.
---
- `<label for>` names the control ([WCAG 1.3.1](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html), [3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)).
- Hint and error ids go in the control's [`aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby).
- On a wrong value, set [`aria-invalid="true"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid) and show the error as text ([WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)).
- Native validation gets the same look through [`:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid), only after the user interacts.
