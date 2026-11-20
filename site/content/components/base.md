---
title: Base elements
summary: Native HTML elements styled by the base layer, with no classes.
---
Each point below is stated in a `css/base/` comment or in [PRINCIPLES.md](PRINCIPLES.md).

- Links keep their underline, so color is never the only cue ([WCAG 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- Every focusable element shows a `:focus-visible` outline in `--dui-color-focus`; under `forced-colors: active` it switches to the system `highlight` color ([WCAG 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)).
- `scroll-padding-block` keeps focused and targeted elements clear of sticky edges ([WCAG 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)).
- Text controls, buttons and summaries are at least `--dui-size-target` tall ([WCAG 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- Checkboxes, radios and range keep native rendering, tinted with `accent-color`.
- Open a `<dialog>` with `showModal()` or a `command="show-modal"` button so the browser handles focus, <kbd>Esc</kbd> and inertness ([APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
- Duration tokens become `0s` under `prefers-reduced-motion: reduce`.
- The CSS cannot add semantics for you: give every control a `<label>`, group controls with `<fieldset>` and `<legend>`, give tables a `<caption>` and `th` with `scope`, and give meaningful images `alt` text (see [Accessibility baseline](PRINCIPLES.md#3-accessibility-baseline-wcag-22-aa)).
