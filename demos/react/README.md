# domestic-ui demo: React

The dashboard, account settings and orders views in React 19 with Vite, as a three-page
[multi-page app](https://vite.dev/guide/build#multi-page-app) (`index.html`, `settings.html` and
`orders.html`). `src/Layout.tsx` renders the app shell around every view and imports
`dui-app-shell.js` and `dui-menu.js`; the orders view adds a page header, a filter bar, a data
table, a list-detail of orders in the order details sidebar and a compact-density toggle, and
imports `dui-combobox.js`, `dui-table.js` and `dui-toolbar.js` from `../../../web-components/`.
`src/custom-elements.d.ts` declares the `dui-*` tags for JSX.

`src/Layout.tsx` imports the shipped stylesheet straight from the repository
(`import '../../../css/domestic.css'`); Vite inlines its `@import … layer()` rules and keeps the
cascade layers. `server.fs.allow` in `vite.config.ts` lets the dev server read `../../css` and `../../web-components`.

## Prerequisites

- Node 24

## Install

```sh
cd demos/react
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
DEMO_APP=react npm test
```
