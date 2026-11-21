---
usage:
  - Keep the label the same in both states; the state is on or off.
  - Wrap the input in its `<label>` so the whole label is the click target.
---
- The native checkbox brings focus, <kbd>Space</kbd> to toggle, form submission and `:checked`. `role="switch"` makes assistive technology announce on and off ([APG Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/), [ARIA in HTML](https://www.w3.org/TR/html-aria/#el-input-checkbox)).
- State is not color alone: the thumb moves and changes color, and the track fills ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- Track border and thumb have 3:1 contrast with the surface ([WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- In [forced colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors), system colors keep both states visible.
