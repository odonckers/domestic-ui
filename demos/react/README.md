# domestic-ui demo: React

The dashboard, account settings and orders views in React 19 with Vite, as a three-page
[multi-page app](https://vite.dev/guide/build#multi-page-app) (`index.html`, `settings.html` and
`orders.html`). `src/OrdersPage.tsx` imports `../../../web-components/dui-combobox.js`, and
`src/dui-combobox.d.ts` declares the tag for JSX.

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
