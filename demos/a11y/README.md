# domestic-ui demos: accessibility checker

Checks the built demo apps the same way the repository checks `examples/`: Playwright with
[axe](https://github.com/dequelabs/axe-core) (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa`), in light and dark, with every `<details>` opened and checked again. Any request that
leaves the local server fails the test.

For each view it also checks: `lang="en"`, the page title, exactly one `<h1>`, one `main#main`,
a `<dui-app-shell data-app-shell>` that upgraded (its Menu toggle shows), one `aria-current="page"`
link in the shell's main navigation (`nav[aria-label="Main"]`), that the first Tab stop is the skip link and
that following it stays on the view, and that domestic-ui's CSS really applied (`--dui-space-m`
is set, `.cluster` is flex, `.visually-hidden` hides the skip link), and that the atoms applied
(a `data-text` lead, except on orders, and footer, a tinted `data-badge` on the dashboard, the
`role="switch"` checkboxes drawn with `appearance: none` on settings; on orders, a page header,
a filter bar, two upgraded `<dui-combobox>` fields, a `<dui-table>` with sort buttons and "select
all" around a `table[data-table]` in a `data-scroll="inline"` region, a tinted badge in it, and a
"Compact table" switch that sets `data-density="compact"` on that region). On orders it also
filters by status, and checks that an order link in the table or in the `data-list-detail` list
shows that order in the order details sidebar with `aria-current="page"` on its list link; for the
prerendered apps (vanilla, Astro) it checks with JavaScript off that every row, the order list and
the default order are there and fit 320px.

Small screens: every view also loads at 320×640 and 375×812. It must not scroll sideways
(`scrollWidth > clientWidth` on `<html>` or `<body>`, closed and with `<details>` open; the failure
lists the elements that stick out), and axe runs again at both sizes in light and dark.

- `apps.js`: where each app's static output lives and the URL of each view.
- `serve.mjs`: tiny zero-dependency static server (`--root`, `--port`, `--spa` for a fallback to
  `/index.html`). `/foo/` serves `/foo/index.html`.
- `playwright.config.js`: one project and one server per app.

## Ports

Each app gets its own server. By default they listen on 4301 (vanilla), 4302 (react),
4303 (angular) and 4304 (astro), and an already running server on those ports is reused
outside CI. Set `PORT` to move all four, for example to run two checkouts side by side:
`PORT=4373 npm test` uses 4373, 4374, 4375 and 4376 (vanilla, react, angular, astro).

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
PORT=4373 npm test        # servers on 4373-4376 instead of 4301-4304

npm run lint:html         # html-validate on vanilla and the built astro pages
npm run lint:html:vanilla # or one of them
npm run lint:html:astro
```
