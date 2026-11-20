# domestic-ui demo: Astro

The dashboard and account settings views as two static Astro pages
(`src/pages/index.astro` and `src/pages/settings.astro`) sharing `src/layouts/Base.astro`.

The layout imports the shipped stylesheet straight from the repository
(`import "../../../../css/domestic.css";`); Astro's Vite build inlines its `@import … layer()`
rules and keeps the cascade layers. No JavaScript ships to the browser.

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
npm run build   # static output in dist/ (/index.html and /settings/index.html)
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
