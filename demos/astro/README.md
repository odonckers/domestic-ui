# domestic-ui demo: Astro

The dashboard, account settings and orders views as three static Astro pages
(`src/pages/index.astro`, `src/pages/settings.astro` and `src/pages/orders.astro`) sharing
`src/layouts/Base.astro`.

The layout imports the shipped stylesheet straight from the repository
(`import "../../../../css/domestic.css";`); Astro's Vite build inlines its `@import … layer()`
rules and keeps the cascade layers. The layout renders the app shell around every view and its
`<script>` imports `dui-app-shell.js` and `dui-menu.js`; a page can pass an order details sidebar as
`<aside slot="aux">`. The orders page renders a page header, a filter bar, a data table, a
list-detail of orders and a compact-density toggle at build time; its `<script>` imports
`dui-combobox.js`, `dui-table.js` and `dui-toolbar.js` and adds the demo filter, density toggle
and order selection.

## Prerequisites

- Node 24

## Install

```sh
cd demos/astro
npm ci
```

## Develop

```sh
npm run dev
# open http://localhost:4321/
```

## Build

```sh
npm run build   # static output in dist/ (/index.html, /settings/index.html and /orders/index.html)
```

## Accessibility check

Build first, then:

```sh
cd ../a11y
npm ci
npx playwright install chromium
DEMO_APP=astro npm test
npm run lint:html:astro
```
