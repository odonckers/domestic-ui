# domestic-ui demos: accessibility checker

Checks the built demo apps the same way the repository checks `examples/`: Playwright with
[axe](https://github.com/dequelabs/axe-core) (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa`), in light and dark, with every `<details>` opened and checked again. Any request that
leaves the local server fails the test.

For each view it also checks: `lang="en"`, the page title, exactly one `<h1>`, one `main#main`,
one `aria-current="page"` link in the primary nav, that the first Tab stop is the skip link and
that following it stays on the view, and that domestic-ui's CSS really applied (`--dui-space-m`
is set, `.cluster` is flex, `.visually-hidden` hides the skip link).

- `apps.js`: where each app's static output lives and the URL of each view.
- `serve.mjs`: tiny zero-dependency static server (`--root`, `--port`, `--spa` for a fallback to
  `/index.html`). `/foo/` serves `/foo/index.html`.
- `playwright.config.js`: one project and one server per app.

## Prerequisites

- Node 24
- The app you want to check, built (`npm ci && npm run build` in its folder; vanilla needs nothing)

## Run

```sh
cd demos/a11y
npm ci
npx playwright install chromium

npm test                  # all four apps (build react, angular and astro first)
DEMO_APP=react npm test   # one app: vanilla, react, angular or astro

npm run lint:html         # html-validate on vanilla and the built astro pages
npm run lint:html:vanilla # or one of them
npm run lint:html:astro
```
