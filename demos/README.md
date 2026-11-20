# Demo apps

The same two views, a household-chores **dashboard** and an **account settings** form,
built four ways to show that domestic-ui works with plain HTML and with common frameworks.
Every view uses the same native markup and the `stack`, `cluster` and `grid` layout primitives.

| App | Stack | Views |
| --- | --- | --- |
| [`vanilla/`](vanilla/) | Plain HTML, no build | `index.html`, `settings.html` |
| [`react/`](react/) | React + Vite (multi-page) | `/`, `/settings.html` |
| [`angular/`](angular/) | Angular CLI + Angular Router | `/`, `/settings` |
| [`astro/`](astro/) | Astro, static output | `/`, `/settings/` |
| [`a11y/`](a11y/) | Shared checker: axe (WCAG 2.2 AA, light and dark) and html-validate | |

Every app links the shipped stylesheet, [`css/domestic.css`](../css/domestic.css), straight from
this repository: no copy, no fork. Bundlers inline its `@import … layer()` rules and keep the
cascade layers. The only app CSS is a tiny page container written with `--dui-*` semantic tokens,
identical in all four apps.

Each app keeps its own `package.json` and `package-lock.json`; nothing is installed at the
repository root. The [Demos workflow](../.github/workflows/demos.yml) builds and checks every app
on pull requests that touch `demos/` or `css/`.

**Phase 2** will switch the views to the atom APIs as they land.
