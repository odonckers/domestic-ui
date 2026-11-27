---
title: Search dialog
summary: A command palette: a modal `<dialog>` holding a combobox of pages and sections, opened from a Search button or with Cmd-K or Ctrl-K.
milestone: M3
level: molecule
standard:
  - APG Dialog (Modal) pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  - APG Combobox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
specs:
  - MDN `<dialog>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
  - MDN `aria-keyshortcuts`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts
---
- The browser does the modal work: `showModal()` or `command="show-modal"` makes the page inert, moves focus to the field (`autofocus`) and returns it to the opener or wherever it was on close ([APG Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
- The dialog is named by its heading; the field has a visible label ([WCAG 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)).
- Results are combobox options: focus stays in the field, arrow keys move the active result, and the count is announced after typing pauses ([WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)).
- The shortcut needs a modifier, so it never fires while typing ([WCAG 2.1.4](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html)); `aria-keyshortcuts` on the opener exposes it.
- A result on the same page moves focus to its heading ([WCAG 2.4.3](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)).
- The opener stays hidden until the script that fills the results runs, so nothing broken shows without JavaScript.
- Why it is built this way, and the choices that are ours: the [search dialog explainer](explainers/search-dialog.md).
