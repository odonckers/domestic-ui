# domestic-ui demo: Svelte

The dashboard, account settings and orders views in Svelte 5 with Vite, as a three-page
[multi-page app](https://vite.dev/guide/build#multi-page-app) (`index.html`, `settings.html` and
`orders.html`). `src/Layout.svelte` renders the app shell around every view, with the order details
sidebar passed in as an `aux` [snippet](https://svelte.dev/docs/svelte/snippet), and imports
`dui-app-shell.js` and `dui-menu.js`; the orders view keeps its filter, selection and shipped orders
in `$state` and `$derived` runes and imports `dui-combobox.js`, `dui-table.js` and `dui-toolbar.js`
from `../../../web-components/`.

The components are the same native markup as [`vanilla/`](../vanilla/): Svelte only binds values
and events. Svelte renders `dui-*` tags as
[custom elements](https://svelte.dev/docs/svelte/custom-elements) with no configuration.
`svelte.config.js` turns on runes mode for every component.

`src/Layout.svelte` imports the shipped stylesheet straight from the repository
(`import '../../../css/domestic.css'`); Vite inlines its `@import … layer()` rules and keeps the
cascade layers. `server.fs.allow` in `vite.config.js` lets the dev server read `../../css` and `../../web-components`.

## Prerequisites

- Node 24

## Install

```sh
cd demos/svelte
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
DEMO_APP=svelte npm test
```
