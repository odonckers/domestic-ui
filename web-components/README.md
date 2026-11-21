# Web components

A few small [custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements),
each added only because native HTML cannot do the job. Before reaching for one, check whether an
element already covers it: `<dialog>`, `<details>`, the
[`popover`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover)
attribute and [invoker commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)
handle many cases that used to need script, and most molecules need none.

## The rule

Every element here:

- exists because HTML or CSS cannot do something, and its header comment says what;
- enhances native markup that already works without JavaScript
  ([progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)):
  content stays readable and links, buttons and sections stay usable with the script off;
- uses the **light DOM**: no shadow root, so the [molecule CSS](../css/components/molecules/README.md)
  and your own CSS style the markup directly, and there is no second styling API;
- follows the matching [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) pattern,
  and adds ARIA roles only when it also adds the keyboard behavior those roles promise;
- is one ES module with no dependencies and no build step, named with the `dui-` prefix, and
  documents its API, events and keyboard in its header comment.

Load one from a page with a module script; it upgrades matching elements already in the page and
any added later:

```html
<script type="module" src="web-components/dui-tabs.js"></script>
```

## Index

| Element | File | Why HTML cannot do it | Molecule or organism | Example |
| --- | --- | --- | --- | --- |
| `<dui-tabs>` | [`dui-tabs.js`](dui-tabs.js) | No tabs element: one panel at a time, roving tabindex and arrow keys ([APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)). Upgrades a `<nav>` of in-page links and `<section>` panels; `aria-current="true"` on a link selects it on load. | [tabs.css](../css/components/molecules/tabs.css) | [tabs.html](../examples/molecules/tabs.html) |
| `<dui-menu>` | [`dui-menu.js`](dui-menu.js) | `popovertarget` opens the list, but there is no menu widget: arrow keys, Home/End, typeahead, opening on a chosen item ([APG Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)). | [menu-button.css](../css/components/molecules/menu-button.css) | [menu-button.html](../examples/molecules/menu-button.html) |
| `<dui-combobox>` | [`dui-combobox.js`](dui-combobox.js) | `<input list>` suggests values, but the browser draws the popup: it cannot be styled, filters differently per engine and announces no result count. Builds an APG list autocomplete listbox from the `<datalist>` and keeps the same input ([APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)). See [combobox.md](../explainers/combobox.md). | [combobox.css](../css/components/molecules/combobox.css) | [combobox.html](../examples/molecules/combobox.html) |
| `<dui-toolbar>` | [`dui-toolbar.js`](dui-toolbar.js) | No roving focus in HTML: one Tab stop with arrow keys between controls ([APG Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)). | [toolbar.css](../css/components/molecules/toolbar.css) | [toolbar.html](../examples/molecules/toolbar.html) |
| `<dui-tooltip>` | [`dui-tooltip.js`](dui-tooltip.js) | A popover cannot open on hover or focus yet. [`interestfor`](https://open-ui.org/components/interest-invokers.explainer/) is the coming standard (Chromium only today); this element stands in until it is interoperable. | [popover.css](../css/components/molecules/popover.css) | [popover.html](../examples/molecules/popover.html) |
| `<dui-toaster>` | [`dui-toaster.js`](dui-toaster.js) | A live region announces messages, but nothing builds a toast, adds its Dismiss button and moves focus sensibly when one goes away. See [toast.md](../explainers/toast.md). | [alerts.css](../css/components/molecules/alerts.css) | [alerts.html](../examples/molecules/alerts.html) |
| `<dui-app-shell>` | [`dui-app-shell.js`](dui-app-shell.js) | A button cannot hide another element and keep `aria-expanded` in step, and a sidebar that is part of the page when wide must become a modal drawer only when the shell is narrow. Toggles `hidden` on a sidebar beside main, moves the one copy of a sidebar into a `<dialog data-dialog="drawer">` (`showModal()`) while it is open on a narrow shell, and switches mode on the shell's own width ([`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)); toggles are `hidden` until it upgrades. See [app-shell.md](../explainers/app-shell.md). | [app-shell.css](../css/layout/app-shell.css) (layout) | [app-shell.html](../examples/app-shell.html) |
| `<dui-table>` | [`dui-table.js`](dui-table.js) | A table cannot reorder its rows, and a checkbox cannot check its siblings, count them or be indeterminate from markup. Adds sortable column buttons with `aria-sort` ([APG Sortable Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)), a "select all" checkbox, the selection count and bulk-action enabling to a native `<table>`; without it the table is a plain table with ordinary checkboxes. | [data-table.css](../css/components/organisms/data-table.css) | [data-table.html](../examples/organisms/data-table.html) |

## Events

| Element | Event | When |
| --- | --- | --- |
| `<dui-tabs>` | `dui-tabs-change` | After the selected tab changes; `event.detail` is `{ tab, panel }`. Bubbles. |
| `<dui-combobox>` | `dui-combobox-filter` | On every input, before filtering; `event.detail` is `{ query }`. Bubbles; cancelable: cancel it to load options yourself, then call `setOptions()`. |
| `<dui-combobox>` | `change` (on the input) | When an option is accepted with Enter or a click, as a native control would. |
| `<dui-toaster>` | `dui-toast-dismiss` | Before a toast is removed. Bubbles; cancelable. |
| `<dui-app-shell>` | `dui-app-shell-toggle` | After a sidebar is expanded, collapsed, opened or closed; `event.detail` is `{ sidebar, edge, expanded, drawer }`. Bubbles. |
| `<dui-table>` | `dui-table-sort` | Before the rows move; `event.detail` is `{ column, index, direction }` (the `<th>`, its column index, `"ascending"` or `"descending"`). Bubbles; cancelable: cancel it to sort on the server, then set `aria-sort` and replace the rows yourself. |

`<dui-menu>`, `<dui-toolbar>` and `<dui-tooltip>` fire no events of their own (nor does `<dui-table>` for selection: listen for `change` on its checkboxes): listen for the native
`click` on items and controls, and the native `toggle` on popovers.
