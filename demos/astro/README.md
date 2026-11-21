# domestic-ui demo: Astro

The dashboard, account settings and orders views as three static Astro pages
(`src/pages/index.astro`, `src/pages/settings.astro` and `src/pages/orders.astro`) sharing
`src/layouts/Base.astro`.

The layout imports the shipped stylesheet straight from the repository
(`import "../../../../css/domestic.css";`); Astro's Vite build inlines its `@import … layer()`
rules and keeps the cascade layers. Only the orders page ships JavaScript: its `<script>` imports
`../../../../web-components/dui-combobox.js` and adds the demo filter, density toggle and detail
selection.

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
