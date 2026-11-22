# Demo apps

The same three views, a household-chores **dashboard**, an **account settings** form and a
warehouse **orders** admin view, built four ways to show that domestic-ui works with plain HTML and with common frameworks.
Every view uses the same native markup, the `stack`, `cluster` and `grid` layout primitives, and
the [atom APIs](../css/components/atoms/README.md): `data-text`, `data-button`, `data-field`,
`data-badge` and the `role="switch"` checkbox, written exactly as in
[`examples/atoms/`](../examples/atoms/index.html). Every view sits in the
[app shell](../css/layout/app-shell.css) (`<dui-app-shell>`: app bar with a `<dui-menu>`, main
navigation, footer). The orders view follows [`examples/app-shell.html`](../examples/app-shell.html):
a page header, a filter bar with two [`<dui-combobox>`](../web-components/dui-combobox.js)
typeaheads, a `<dui-table>` data table with a `data-density` toggle, and the selected order in the
order details sidebar as a `data-list-detail` list and detail.

| App | Stack | Views |
| --- | --- | --- |
| [`vanilla/`](vanilla/) | Plain HTML, no build | `index.html`, `settings.html`, `orders.html` |
| [`react/`](react/) | React + Vite (multi-page) | `/`, `/settings.html`, `/orders.html` |
| [`angular/`](angular/) | Angular CLI + Angular Router | `/`, `/settings`, `/orders` |
| [`astro/`](astro/) | Astro, static output | `/`, `/settings/`, `/orders/` |
| [`a11y/`](a11y/) | Shared checker: axe (WCAG 2.2 AA, light and dark) and html-validate | |

Every app links the shipped stylesheet, [`css/domestic.css`](../css/domestic.css), straight from
this repository: no copy, no fork. So the demos always match the shipped `css/` at the same commit: at the
[v0.1.0 release](https://github.com/odonckers/domestic-ui/releases/tag/v0.1.0) they show v0.1.0. Bundlers inline its `@import … layer()` rules and keep the
cascade layers. There is no app CSS: the app shell and organisms lay out every view (Angular only
adds `app-root { display: block; }`, since custom elements are inline by default).

Each app keeps its own `package.json` and `package-lock.json`; nothing is installed at the
repository root. The [Demos workflow](../.github/workflows/demos.yml) builds and checks every app
on pull requests that touch `demos/` or `css/`.
