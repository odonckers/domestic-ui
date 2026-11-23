# CLAUDE.md: domestic-ui

A standards-first design system: native HTML elements, CSS custom properties as tokens (`--dui-*`), cascade layers, and a few web components where native falls short. Atomic design (tokens, atoms, molecules, organisms). MIT. Repo: https://github.com/odonckers/domestic-ui. Docs: https://odonckers.github.io/domestic-ui/.

Read [PRINCIPLES.md](PRINCIPLES.md) before changing behavior. [CONTRIBUTING.md](CONTRIBUTING.md) is the human-facing version of these rules and wins if the two disagree.

## Stack and layout

- Zero-build CSS: `css/domestic.css` declares `@layer reset, tokens, base, layout, components, utilities;` and imports `css/reset`, `css/tokens` (`primitives.css`, `semantic.css`), `css/base`, `css/layout`, `css/components/{atoms,molecules,organisms}` and `css/utilities`.
- `web-components/`: `dui-app-shell`, `dui-combobox`, `dui-menu`, `dui-table`, `dui-tabs`, `dui-toaster`, `dui-toolbar`, `dui-tooltip` (plain JS custom elements, light DOM).
- `examples/`: named snippet blocks. They are the single source for docs examples and test fixtures.
- `explainers/`: Open UI/W3C-style explainers for our own patterns (RFC 2119 wording).
- `site/`: zero-dependency docs build (`site/build.mjs`) that writes `_site/` plus `README.md`, `llms.txt` and `llms-full.txt`.
- `demos/`: `vanilla` (no build), `react` (Vite), `angular` and `astro`, each with its own `package.json`. `demos/a11y` is the shared axe and html-validate checker.
- `tests/`: Playwright specs (Chromium, Firefox, WebKit) with axe.
- Node >= 24.8 (`engines` in `package.json`). The repo root installs dev tooling only.

## Commands

- Install: `npm ci`, then `npx playwright install --with-deps` once for the Chromium, Firefox and WebKit builds the pinned Playwright expects.
- Everything: `npm test` (html-validate, Stylelint, token check, Playwright + axe).
- Use a free port if anything else may be serving: `PORT=4600 npm test` (default 4173; parallel checkouts otherwise reuse each other's server).
- One spec: `PORT=4600 npx playwright test tests/atoms.spec.js --project=chromium`
- Preview: `node site/build.mjs && node scripts/serve.mjs`, then open http://127.0.0.1:4173/_site/index.html
- Generated files: `node site/build.mjs` writes `README.md`, `llms.txt` and `llms-full.txt`; `node site/build.mjs --check` fails if they are stale (CI runs it).
- Alignment pass for layout, nav, toolbar, menu, tabs, dialog or table changes: read `.claude/skills/gridlines/DOMESTIC-UI.md`, then `npm run gridlines -- examples/app-shell.html`.
- Demos: `cd demos/<react|angular|astro> && npm ci && npm run build`. Checks: `cd demos/a11y && npm ci && DEMO_APP=<vanilla|react|angular|astro> npm test` (see `demos/a11y/README.md` for prerequisites).
- Commit lint: `echo "fix(nav): keep the marker on aria-current" | npx commitlint`
- Changelog: `npm run changelog` and `npm run changelog:check` run at release time only (see Releasing in CONTRIBUTING.md). Between releases `changelog:check` reports the file out of date by design, and CI does not run it.

## Where work comes from

- Work is tracked as Linear issues. Each issue is a self-contained spec: problem, scope, acceptance criteria, standards to cite, and a suggested PR title. If an issue is unclear or conflicts with PRINCIPLES.md, ask the maintainer instead of guessing.
- Flow: pick up the issue (assign it, move it to In Progress), create a branch named after it, do the work and run the checks below, then open a PR against `main` whose title follows Conventional Commits and whose body links the issue.
- Follow-up work you notice becomes a new issue, not scope creep in the current PR.

## Rules for code

- Native element first; ARIA only where native can't. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA. No page overflows at 320px.
- Components never hard-code values; theme only through semantic `--dui-*` tokens. Give every new token a description comment.
- Link MDN, WHATWG, W3C, WCAG or the APG for every borrowed fact. Never claim originality. A choice of ours is labeled "Our choice" with one line on why.
- Docs style: MDN structure (summary, live example, attributes or API, accessibility, specifications, see also). One home per element. Markup comes once from `examples/` snippets, and prose never repeats it.
- If a change feeds `site/build.mjs` (CSS header comments, `examples/`, PRINCIPLES.md, `site/content`), run `node site/build.mjs` and commit its unedited output in the same PR. Never hand-edit `README.md` or `llms*.txt`.
- Before asking for review: `npm test` green locally; render changed pages at 1280 and 390 wide in Chromium, WebKit and Firefox, plus forced colors; say what you checked in the PR.

## Commits, PRs and the changelog

- Every commit follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): description`, lowercase in type, scope and description. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Header at most 100 characters. Breaking changes use `!` or a `BREAKING CHANGE:` footer.
- We squash-merge, so the PR title becomes the commit on `main` and must follow the same format. CI's `commits` job lints the title and every commit; retitling re-runs CI.
- `CHANGELOG.md` is generated from the commits on `main` (git-cliff, `cliff.toml`, `npm run changelog`). Never edit it by hand and never add changelog entries in a PR: the commit message is the entry.
- Branch names: `feat/…`, `fix/…`, `docs/…`, `a11y/…`, `ci/…`, `build/…`, `chore/…`.

## Branches, checks and merging

- Never push to `main`. The "Protect main" ruleset requires the `owen-gate` and `ci` checks and up-to-date branches; force-pushes and deleting `main` are blocked.
- Keep a branch current by merging `main` into it (`git merge origin/main`). Never rebase or force-push a pushed branch.
- Squash merge only. The maintainer merges, unless they ask you to in the session; never enable auto-merge.
- Outside issues and PRs get `needs-owen-approval`; only the maintainer applies `owen-approved`.
- No npm publish, no release tag and no repository-setting change unless the maintainer asks for it in the session.
