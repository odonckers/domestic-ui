# domestic-ui demo: plain HTML

The dashboard, account settings and orders views as three static HTML files, with no build step.
Every view sits in the app shell (`<dui-app-shell data-app-shell>`: app bar, main navigation, footer).
The orders view adds a page header, a filter bar, a data table, a list-detail of orders in the
order details sidebar, and a compact-density toggle, written as in `examples/app-shell.html`. All
rows, the order list and the default order are in the HTML, so it works without JavaScript;
`orders.js` only filters rows, shows the chosen order and toggles density. The pages load the
custom elements they use from `../../web-components/` as module scripts.

## Prerequisites

- Node 24 (only for the local server and the accessibility check)

## Run

There is nothing to install or build. The pages link `../../css/domestic.css`, so serve the
**repository root** and open the views under `/demos/vanilla/`:

```sh
# from the repository root
node demos/a11y/serve.mjs --root . --port 4301
# open http://127.0.0.1:4301/demos/vanilla/index.html
```

## Accessibility check

```sh
cd demos/a11y
npm ci
npx playwright install chromium
DEMO_APP=vanilla npm test
npm run lint:html:vanilla
```
