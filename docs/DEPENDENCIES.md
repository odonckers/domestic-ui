# Dependencies

What domestic-ui depends on, why, and the security review behind each one. The published system
(`css/`, `web-components/`) has **no runtime dependencies**: nothing here ships to a page that uses it.
Everything below is dev tooling, CI, or a demo app that shows the library inside a framework.

## Rules

- Every new direct dependency is added in a pull request that adds a row to the inventory below, in the same PR.
  A dependency with more to say (what it can touch, why we accepted it) also gets a review section.
- Root dev dependencies are pinned exactly (`--save-exact`). Demo apps may keep the ranges their framework's
  scaffolding writes. Every `package-lock.json` is committed and CI installs with `npm ci`, so CI installs what
  was reviewed.
- A dependency may never be imported by anything under `css/` or `web-components/`.
- A review covers: who publishes it, licence, where it runs, install scripts (`hasInstallScript` in the
  lockfile), known advisories (`npm audit`), and what it can touch when it runs. Transitive packages are not
  reviewed one by one: the lockfiles pin them and `npm audit` covers them.
- A high or critical advisory, a copyleft licence beyond MPL-2.0, or an install script that downloads code needs
  the maintainer's approval in the PR.

`npm run lint:deps` (part of `npm test` and the CI `lint` job) enforces the inventory. It collects every direct
dependency: npm `dependencies`, `devDependencies`, `optionalDependencies` and `peerDependencies` in `package.json`
and each `demos/<app>/package.json`, plus every GitHub Action (`uses:`) and container image (`image:`) in
`.github/workflows/`. It fails when one has no inventory row, or when a row names something nothing uses. It
reads the name in backticks in a row's first cell and needs the last cell to be the review date. A row for
`@scope/*` covers every package in that scope.

## Inventory

### Dev tooling

| Package | Used by | Runs | License | Publisher | Install scripts | Audit | Reviewed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`@playwright/test`](https://github.com/microsoft/playwright) 1.65 | root, `demos/a11y` | Tests only (local and CI) | Apache-2.0 | Microsoft | None (browsers install with `npx playwright install`) | 0 vulnerabilities | 2026-11-27 |
| [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm) 4.14 | root, `demos/a11y` | Tests only | MPL-2.0 (used unmodified) | Deque Systems | None | 0 vulnerabilities | 2026-11-27 |
| [`html-validate`](https://gitlab.com/html-validate/html-validate) 11.21 | root, `demos/a11y` | Lint only | MIT | David Sveningsson | None | 0 vulnerabilities | 2026-11-27 |
| [`stylelint`](https://github.com/stylelint/stylelint) 18.1 | root | Lint only | MIT | stylelint org | None | 0 vulnerabilities | 2026-11-27 |
| [`stylelint-config-standard`](https://github.com/stylelint/stylelint-config-standard) 41.1 | root | Lint only | MIT | stylelint org | None | 0 vulnerabilities | 2026-11-27 |
| [`@commitlint/cli`](https://github.com/conventional-changelog/commitlint) 21.2 | root | Commit and PR title lint (CI) | MIT | conventional-changelog org | None | 0 vulnerabilities | 2026-11-27 |
| [`@commitlint/config-conventional`](https://github.com/conventional-changelog/commitlint) 21.2 | root | Commit lint | MIT | conventional-changelog org | None | 0 vulnerabilities | 2026-11-27 |
| [`git-cliff`](https://github.com/orhun/git-cliff) 2.14 | root | Release time only (`npm run changelog`) | MIT OR Apache-2.0 | Orhun Parmaksız | None (prebuilt binary picked through platform `optionalDependencies`) | 0 vulnerabilities | 2026-11-27 |
| [`web-features`](https://github.com/web-platform-dx/web-features) 3.48 | root | Only when someone runs `npm run platform:status` | Apache-2.0 | W3C WebDX Community Group | None (`prepare` runs only from a git checkout) | 0 vulnerabilities | 2026-11-27 |

### Demo apps

| Package | Used by | Runs | License | Publisher | Install scripts | Audit | Reviewed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`react`](https://github.com/facebook/react) 19.3 | `demos/react` | In the browser (demo only) | MIT | Meta (React team) | None | 0 vulnerabilities | 2026-11-27 |
| [`react-dom`](https://github.com/facebook/react) 19.3 | `demos/react` | In the browser (demo only) | MIT | Meta (React team) | None | 0 vulnerabilities | 2026-11-27 |
| [`vite`](https://github.com/vitejs/vite) 8 | `demos/react` | Build time and local dev server only | MIT | Vite team (vitejs org) | None (optional macOS-only `fsevents` in its tree) | 0 vulnerabilities | 2026-11-27 |
| [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) 6.3 | `demos/react` | Build time only | MIT | Vite team (vitejs org) | None | 0 vulnerabilities | 2026-11-27 |
| [`oxlint`](https://github.com/oxc-project/oxc) 1.94 | `demos/react` | Lint only | MIT | oxc project | None (native binary through platform optional dependencies) | 0 vulnerabilities | 2026-11-27 |
| [`typescript`](https://github.com/microsoft/TypeScript) 7.0 / 6.0 | `demos/react`, `demos/angular` | Build time only | Apache-2.0 | Microsoft | None | 0 vulnerabilities | 2026-11-27 |
| [`@types/*`](https://github.com/DefinitelyTyped/DefinitelyTyped) | `demos/react` (`node`, `react`, `react-dom`) | Type checking only; no code | MIT | DefinitelyTyped | None | 0 vulnerabilities | 2026-11-27 |
| [`@angular/*`](https://github.com/angular/angular) 22.3 | `demos/angular` (`common`, `compiler`, `core`, `forms`, `platform-browser`, `router`, `build`, `cli`, `compiler-cli`) | In the browser (demo only) and build time | MIT | Google (Angular team) | None in `@angular/*`; `@angular/build` brings `esbuild`, `@parcel/watcher`, `lmdb` and `msgpackr-extract`, which select or build a native binary for the host | 0 vulnerabilities | 2026-11-27 |
| [`rxjs`](https://github.com/ReactiveX/rxjs) 7.8 | `demos/angular` | In the browser (demo only) | Apache-2.0 | ReactiveX org | None | 0 vulnerabilities | 2026-11-27 |
| [`tslib`](https://github.com/microsoft/tslib) 2.9 | `demos/angular` | In the browser (demo only) | 0BSD | Microsoft | None | 0 vulnerabilities | 2026-11-27 |
| [`vitest`](https://github.com/vitest-dev/vitest) 5.1 | `demos/angular` | Tests only | MIT | Vitest team | None | 0 vulnerabilities | 2026-11-27 |
| [`jsdom`](https://github.com/jsdom/jsdom) 31.0 | `demos/angular` | Tests only | MIT | jsdom org | None | 0 vulnerabilities | 2026-11-27 |
| [`prettier`](https://github.com/prettier/prettier) 3.10 | `demos/angular` | Formatting only | MIT | Prettier org | None | 0 vulnerabilities | 2026-11-27 |
| [`astro`](https://github.com/withastro/astro) 7.4 | `demos/astro` | Build time (static output) | MIT | Astro core team (withastro org) | None (optional macOS-only `fsevents` in its tree) | 0 vulnerabilities | 2026-11-27 |

### CI

| Package | Used by | Runs | License | Publisher | Install scripts | Audit | Reviewed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`actions/checkout`](https://github.com/actions/checkout) v7 | every workflow | GitHub-hosted runner | MIT | GitHub | n/a | Pinned to major tag | 2026-11-27 |
| [`actions/setup-node`](https://github.com/actions/setup-node) v7 | every workflow | GitHub-hosted runner | MIT | GitHub | n/a | Pinned to major tag | 2026-11-27 |
| [`actions/upload-artifact`](https://github.com/actions/upload-artifact) v7 | `ci.yml`, `demos.yml` | GitHub-hosted runner | MIT | GitHub | n/a | Pinned to major tag | 2026-11-27 |
| [`actions/configure-pages`](https://github.com/actions/configure-pages) v6 | `pages.yml` | GitHub-hosted runner | MIT | GitHub | n/a | Pinned to major tag | 2026-11-27 |
| [`actions/upload-pages-artifact`](https://github.com/actions/upload-pages-artifact) v5 | `pages.yml` | GitHub-hosted runner | MIT | GitHub | n/a | Pinned to major tag | 2026-11-27 |
| [`actions/deploy-pages`](https://github.com/actions/deploy-pages) v5 | `pages.yml` | GitHub-hosted runner | MIT | GitHub | n/a | Pinned to major tag | 2026-11-27 |
| [`mcr.microsoft.com/playwright`](https://mcr.microsoft.com/en-us/artifact/mar/playwright/) v1.65.1-noble | `ci.yml` `lint` and `playwright` jobs | CI container, as a non-root user | Apache-2.0 (Ubuntu packages under their own) | Microsoft | n/a | Tag kept equal to `@playwright/test` | 2026-11-27 |

### Notes from the 2026-11-27 review

- `npm audit` reported 0 vulnerabilities in the root (142 packages), `demos/a11y` (18), `demos/react` (97),
  `demos/angular` (424) and `demos/astro` (311) lockfiles.
- The only install scripts are in the demo trees: the optional, macOS-only `fsevents` (React, Angular, Astro) and the
  Angular build stack's native binaries (`esbuild`, `@parcel/watcher`, `lmdb`, `msgpackr-extract`). They run only when
  someone builds that demo.
- None of the demo packages reaches a user of domestic-ui: they live in each demo's own `package.json`, and nothing
  under `css/` or `web-components/` imports them.
- **Our choice:** first-party `actions/*` are pinned to a major tag, because GitHub owns both the actions and the
  runner. A third-party action must be pinned to a full commit SHA, as
  [GitHub's security hardening guide](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)
  recommends.
- Vendored assets are not packages but are reviewed here too: the optional Inter font in `css/fonts/` (SIL Open Font
  License 1.1, `css/fonts/OFL.txt`; static WOFF2 files from Fontsource 5.3.0) and the [Lucide](https://lucide.dev/)
  icons copied as inline SVG (ISC; static markup, no scripts).

## Reviews

### `web-features`

- **What:** the W3C WebDX Community Group's catalogue of web platform features and their
  [Baseline](https://web.dev/baseline) status, published as JSON
  ([repository](https://github.com/web-platform-dx/web-features)). `scripts/platform-status.mjs` reads it to
  fill the Status column of [ARCHITECTURE.md, section 6](ARCHITECTURE.md#6-standards-we-build-on).
- **Maintainers:** the WebDX Community Group, with npm maintainers from browser vendors and the community
  (including Google's release bot). It is the data source MDN uses for its Baseline badges. Releases are
  frequent (weekly), so a stale pin only means older data.
- **Licence:** Apache-2.0, compatible with our MIT licence for a development tool.
- **What it pulls in:** nothing. It has no dependencies.
- **Install scripts:** none run on install. Its only script is `prepare`, which npm runs when building from
  a git checkout, not when installing from the registry.
- **Advisories:** none (`npm audit`, 2026-11-27).
- **What it can touch:** it is data plus a small typed entry point, imported only by
  `scripts/platform-status.mjs`, which prints to the terminal. It runs only when someone runs that script,
  never in CI checks or the docs build.
- **Decision:** accepted as a pinned dev dependency. Bump it deliberately, then rerun the script and update
  ARCHITECTURE.md section 6 in the same PR.
