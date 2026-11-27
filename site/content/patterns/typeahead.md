---
title: Typeahead
summary: A text field that suggests values as you type: `<datalist>` first, an APG combobox where it falls short.
milestone: M3
level: molecule
standard:
  - HTML `<datalist>` element: https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element
  - APG Combobox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
sources:
  - combobox
specs:
  - MDN `<datalist>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist
see-also:
  - [Search dialog](site:patterns/search-dialog.html): a typeahead in a modal dialog, to search a whole site
keyboard:
  - Down Arrow / Up Arrow: opens the suggestions and moves to the next or previous one.
  - Enter: accepts the highlighted suggestion and closes the list.
  - Escape: closes the list of suggestions.
---
