# Explainers

An explainer describes a pattern that has **no native HTML element and no
[APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/)**, written the way a platform feature
would be proposed. The format follows the [W3C TAG explainer guidance](https://tag.w3.org/explainers/)
and the explainers published by [Open UI](https://open-ui.org/). Nothing here is a standard; each
file says which parts are **Our choice** and why.

## When an explainer is required

domestic-ui uses, in order: a native element, then the matching APG pattern, then ARIA only where
native HTML cannot express something ([PRINCIPLES.md](../PRINCIPLES.md)). A molecule that ends up
with neither a native element nor an APG pattern MUST have an explainer here, linked from the
header comment of its CSS file and from the
[molecules index](../css/components/molecules/README.md). Layouts with no standard of their own (the [split view](split-view.md), the [app shell](app-shell.md)) may have one too.
Patterns that are backed by a standard
(dialog, details, popover, tabs, menu button, toolbar, breadcrumb, search) link to that standard
instead.

## Keywords

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Sections

Every explainer has these sections, in this order:

1. **Problem**: what authors cannot do well today.
2. **Use cases**: concrete situations.
3. **Goals** and 4. **Non-goals**.
5. **Proposed markup and API**: the attribute, element or methods we ship, with an example.
6. **Keyboard interaction**.
7. **Accessibility mappings**: roles, states, and what assistive technology users should hear.
8. **Alternatives considered**, each with why it was rejected.
9. **Prior art**, with links. We cite; we do not copy.
10. **Open questions**.

Names follow HTML and ARIA conventions (lowercase, no abbreviations, states in native attributes)
so a pattern could map onto a future native element or attribute.

## Index

| Explainer | Summary | CSS | Example | Script |
| --- | --- | --- | --- | --- |
| [Card](card.md) | A self-contained summary with a heading, optional media and actions; a whole-card link whose name is the heading | [`card.css`](../css/components/molecules/card.css) | [card.html](../examples/molecules/card.html) | None |
| [Pagination](pagination.md) | Links between pages of a list in a named `<nav>`, with `aria-current="page"` and non-link disabled ends | [`pagination.css`](../css/components/molecules/pagination.css) | [pagination.html](../examples/molecules/pagination.html) | None |
| [Drawer](drawer.md) | A `<dialog>` variant at the inline-start or inline-end edge, full block size | [`dialog.css`](../css/components/molecules/dialog.css) | [dialog.html](../examples/molecules/dialog.html) | None |
| [Toast](toast.md) | A fixed `role="status"` region that stacks short messages that never dismiss themselves | [`alerts.css`](../css/components/molecules/alerts.css) | [alerts.html](../examples/molecules/alerts.html) | [`dui-toaster.js`](../web-components/dui-toaster.js) |
| [Combobox](combobox.md) | How domestic-ui maps the APG list autocomplete combobox onto `<input list>` and `<datalist>`, and the choices the APG leaves open | [`combobox.css`](../css/components/molecules/combobox.css) | [combobox.html](../examples/molecules/combobox.html) | [`dui-combobox.js`](../web-components/dui-combobox.js) |
| [Density](density.md) | `data-density="compact"` on any element: tighter control heights, padding and table cells, same text size, targets at least 24px | [`semantic.css`](../css/tokens/semantic.css) | [density.html](../examples/patterns/density.html) | None |
| [App shell](app-shell.md) | `data-app-shell`: app bar, primary sidebar, main and an auxiliary sidebar as native landmarks in named grid areas; one copy of each sidebar, collapsible beside main and a modal drawer when the shell is narrow; why not a dialog, popover, `<details>`, checkbox hack or duplicated navigation | [`app-shell.css`](../css/layout/app-shell.css) | [app-shell.html](../examples/app-shell.html) | [`dui-app-shell.js`](../web-components/dui-app-shell.js) |
| [Auxiliary sidebar](aux-sidebar.md) | The `<aside>` after `<main>` in an app shell: context for the selection, beside main from 64rem, a drawer at the end below; stable name, polite status on change | [`app-shell.css`](../css/layout/app-shell.css) | [app-shell.html](../examples/app-shell.html) | [`dui-app-shell.js`](../web-components/dui-app-shell.js) |
| [Split view](split-view.md) | Two regions side by side at a fixed ratio (`data-split`) or a list of links beside a detail pane (`data-list-detail`), switched by a container query; why there is no draggable divider | [`split.css`](../css/layout/split.css), [`list-detail.css`](../css/layout/list-detail.css) | [split.html](../examples/layouts/split.html) | None |
