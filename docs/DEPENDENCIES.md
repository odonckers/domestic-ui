# Dependencies

What domestic-ui depends on, why, and the security review behind each one. The published system
(`css/`, `web-components/`) has **no runtime dependencies**: nothing here ships to a page that uses it.
Everything below is a pinned development dependency in the root `package.json`. The demo apps in `demos/`
have their own `package.json` files and are reviewed separately.

## Rules

- Every new dependency is added in a pull request that adds a row to the table below and a review section,
  in the same PR.
- Versions are pinned exactly (`--save-exact`), and `package-lock.json` is committed, so CI installs what
  was reviewed.
- A dependency may never be imported by anything under `css/` or `web-components/`.
- A review covers: who maintains it, licence, what it pulls in (transitive packages), install scripts,
  known advisories (`npm audit`), and what it can touch when it runs.

## Inventory

Reviewed 2026-11-27, `npm audit`: 0 vulnerabilities across 142 installed packages, and no package in the lockfile
declares an install script (`hasInstallScript`).

| Package | Version | Licence | Used for | Direct dependencies |
| --- | --- | --- | --- | --- |
| `@playwright/test` | 1.65.1 | Apache-2.0 | The test runner, in three engines | 1 |
| `@axe-core/playwright` | 4.14.0 | MPL-2.0 | Accessibility checks inside the tests | 1 |
| `html-validate` | 11.21.1 | MIT | Validating `examples/` | 6 |
| `stylelint` | 18.1.0 | MIT | Linting `css/` | 19 |
| `stylelint-config-standard` | 41.1.0 | MIT | The Stylelint rule set | 1 |
| `@commitlint/cli` | 21.2.4 | MIT | Checking commit and PR titles | 8 |
| `@commitlint/config-conventional` | 21.2.4 | MIT | The Conventional Commits rule set | 2 |
| `git-cliff` | 2.14.2 | MIT or Apache-2.0 | Generating `CHANGELOG.md` at release time | 1 |
| `web-features` | 3.48.0 | Apache-2.0 | Baseline status for `npm run platform:status` | 0 |

## Reviews

### web-features

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

### Existing tools

The other eight packages were added before this file existed. They are the standard tools for their jobs,
each maintained by its project's organization (Microsoft for Playwright, Deque for axe, the Stylelint, commitlint,
html-validate and git-cliff projects), pinned, free of install scripts and free of known advisories as of the
inventory date. Any version bump to one of them gets a short review note here in the same PR.
