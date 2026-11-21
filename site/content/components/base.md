---
title: Base elements
summary: Native HTML elements styled by the base layer, with no classes.
---
- Links keep their underline, so color is never the only cue ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- Every focusable element shows a `:focus-visible` outline in `--dui-color-focus`, the system `highlight` color in forced colors ([WCAG 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)).
- `scroll-padding-block` keeps focused elements clear of sticky edges ([WCAG 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)).
- Text controls, buttons and summaries are at least `--dui-size-target` tall ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- Checkboxes, radios and range keep native rendering, tinted with `accent-color`.
- Open a `<dialog>` with `showModal()` or `command="show-modal"` so the browser handles focus, <kbd>Esc</kbd> and inertness ([APG Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
- Duration tokens are `0s` under `prefers-reduced-motion: reduce`.
- CSS cannot add semantics: label every control, group with `<fieldset>` and `<legend>`, give tables a `<caption>` and `th scope`, and images `alt` ([Accessibility baseline](PRINCIPLES.md#3-accessibility-baseline-wcag-22-aa)).
