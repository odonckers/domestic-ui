---
summary: Button variants and sizes, links styled as buttons, and disabled and loading states.
usage:
  - On `<a href>`, it looks like a button and keeps link semantics.
---
- `aria-disabled="true"` stays focusable, so a description can say why; your script must ignore activation ([APG](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#focusabilityofdisabledcontrols)).
- With `aria-busy="true"`, also change the label ("Saving…") and announce the result in a `role="status"` region.
