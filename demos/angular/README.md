# domestic-ui demo: Angular

The dashboard and account settings views in Angular 22: standalone components, two routes
(`''` and `'settings'`) with Angular Router, a `title` per route, and `routerLinkActive` with
`ariaCurrentWhenActive="page"` for the current link.

The shipped stylesheet is listed in `angular.json` `styles` as `../../css/domestic.css`, so the
build bundles it with its cascade layers. `src/styles.css` holds only the page container.

Two choices worth knowing:

- Each routed page's host element is the `<main id="main">` landmark itself
  (`selector: 'main[app-dashboard-page]'`), so there is no wrapper element between `<main>` and
  its content and the markup matches the other demos.
- The base href is provided with `APP_BASE_HREF` instead of a `<base href="/">` element. A
  `<base>` element would make the skip link (`href="#main"`) resolve to `/#main` and leave the
  current view.

## Prerequisites

- Node 24

## Install

```sh
cd demos/angular
npm ci
```

## Develop

```sh
npm start
# open http://localhost:4200/
```

## Build

```sh
npm run build   # static output in dist/angular/browser/
```

Serve `dist/angular/browser/` with a fallback to `index.html` for unknown paths, so `/settings`
loads the app.

## Accessibility check

Build first, then:

```sh
cd ../a11y
npm ci
npx playwright install chromium
DEMO_APP=angular npm test
```
