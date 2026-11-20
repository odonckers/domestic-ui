# Web components

Empty for now, on purpose.

A few [custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
may land here, but only when native HTML cannot do the job. Before adding one,
check whether an element already covers it: `<dialog>`, `<details>`,
the [`popover`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover)
attribute and [invoker commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)
handle many cases that used to need script.

When a custom element does land, it will:

- enhance native markup that already works without JavaScript
  ([progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement));
- follow the matching [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) pattern;
- be styled with semantic tokens only, from the `components` layer;
- document its single attribute API and have no hidden behavior.
