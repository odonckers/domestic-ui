# domestic-ui demo: plain HTML

The dashboard, account settings and orders views as three static HTML files, with no build step.
`orders.html` loads `../../web-components/dui-combobox.js` and renders its sample orders from
`orders.js` with a short module script.

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
