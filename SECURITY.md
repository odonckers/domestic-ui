# Security policy

Please report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/odonckers/domestic-ui/security/advisories/new).

Do not open a public issue for a security report. We will respond through that private advisory.

## Dependency reviews

The library itself ships no runtime dependencies: `css/` and `web-components/` are plain files. Dev tooling, CI and the
demo apps do install packages. Every direct dependency gets a review here, in the PR that adds it, covering what it is
for, where it runs, its license, who publishes it, its install scripts and `npm audit`. Lockfiles are committed and CI
installs with `npm ci`.

`npm run lint:deps` (part of `npm test` and the CI `lint` job) fails when a direct dependency has no row here, or when a
row names something nothing uses any more. It reads the first column: the name in backticks. A row for `@scope/*`
covers every package in that scope.

What counts as a direct dependency:

- npm `dependencies`, `devDependencies`, `optionalDependencies` and `peerDependencies` in `package.json` and each
  `demos/<app>/package.json`.
- Every GitHub Action (`uses:`) and container image (`image:`) in `.github/workflows/`.

Transitive packages are not reviewed one by one: the lockfiles pin them and `npm audit` covers them. A dependency with a
high or critical advisory, a copyleft license beyond MPL-2.0, or an install script that downloads code needs the
maintainer's approval in the PR.

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

Notes from the 2026-11-27 review:

- `npm audit` reported 0 vulnerabilities in the root (141 packages), `demos/a11y` (18), `demos/react` (97),
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
