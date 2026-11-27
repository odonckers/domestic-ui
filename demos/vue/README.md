# domestic-ui demo: Vue

The dashboard, account settings and orders views in Vue 3 with Vite, as a three-page
[multi-page app](https://vite.dev/guide/build#multi-page-app) (`index.html`, `settings.html` and
`orders.html`) of single-file components. `src/Layout.vue` renders the app shell around every view,
with the order details sidebar in an `aux` slot, and imports `dui-app-shell.js` and `dui-menu.js`;
the orders view keeps its filter, selection and shipped orders in `ref` and `computed` state and
imports `dui-combobox.js`, `dui-table.js` and `dui-toolbar.js` from `../../../web-components/`.

The templates are the same native markup as [`vanilla/`](../vanilla/): Vue only binds values and
events. `isCustomElement` in `vite.config.js` tells the template compiler that `dui-*` tags are
[custom elements](https://vuejs.org/guide/extras/web-components.html#using-custom-elements-in-vue),
not Vue components (and lists `<search>`, which Vue's tag list may not include yet).

`src/Layout.vue` imports the shipped stylesheet straight from the repository
(`import '../../../css/domestic.css'`); Vite inlines its `@import … layer()` rules and keeps the
cascade layers. `server.fs.allow` in `vite.config.js` lets the dev server read `../../css` and `../../web-components`.

## Prerequisites

- Node 24

## Install

```sh
cd demos/vue
npm ci
```

## Develop

```sh
npm run dev
# open http://localhost:5173/, /settings.html and /orders.html
```

## Build

```sh
npm run build   # static output in dist/
```

## Accessibility check

Build first, then:

```sh
cd ../a11y
npm ci
npx playwright install chromium
DEMO_APP=vue npm test
```
