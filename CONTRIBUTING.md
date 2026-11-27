# Contributing to domestic-ui

Thanks for helping. This project is a design system built on native HTML, CSS tokens, and published web standards.

## Issues and pull requests

All work is tracked as [GitHub issues](https://github.com/odonckers/domestic-ui/issues), grouped into [milestones](https://github.com/odonckers/domestic-ui/milestones) in roadmap order and shown on the [project board](https://github.com/users/odonckers/projects/6). Use the issue forms for bugs and feature requests. Pull requests should use the template.

To pick up an issue:

1. Comment on it first, so two people don't do the same work. `good first issue` and `help wanted` are good places to start.
2. Check that any issue listed under "Blocked by" is closed.
3. Open a pull request whose body says `Fixes #<number>`, so the issue [closes when the PR merges](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue).

Work you notice along the way becomes a new issue rather than growing the current pull request.

Labels you will see: `bug`, `enhancement`, `docs`, `a11y`, `tokens`, `demos`, `good first issue` and `help wanted` ([about labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels)).

Branch names follow `fix/short-description`, `feat/short-description`, `docs/short-description`, or `a11y/short-description`.

### Reviews

Every pull request, from inside or outside the project, gets the same review and must pass CI before it merges. GitHub holds CI on a first-time contributor's pull request until a maintainer approves the workflow run.

A pull request squash-merges once it is approved and CI is green on a branch that is up to date with `main`. To keep merges from making each other's branches stale, merging takes turns through the pinned [Merge turn](https://github.com/odonckers/domestic-ui/issues/128) issue:

1. When your pull request is green, check the issue. If the newest `claim` has no matching `released` and is under 40 minutes old, wait.
2. Comment `claim #<your PR>`, merge `main` into your branch if it is behind, and wait for CI.
3. Squash-merge when CI is green (or release the turn if a fix will take a while), then comment `released #<your PR>`.

A claim with no `released` after 40 minutes is stale, and the next pull request may take the turn. Outside a turn, merge `main` into a branch only to resolve a conflict.

`.github/CODEOWNERS` lists @odonckers on every file. That file is informational today: team bots push with the same GitHub account as Owen, so GitHub cannot tell his review apart from a bot's.

## Standards

- Prefer a native HTML element before adding a component or custom behavior.
- Check visual and interaction changes against the [design principles](PRINCIPLES.md#14-design-principles), and say in the pull request which ones apply.
- Cite the relevant [MDN](https://developer.mozilla.org/), [WHATWG](https://whatwg.org/), [W3C](https://www.w3.org/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), or [APG](https://www.w3.org/WAI/ARIA/apg/) documentation in the issue or pull request.
- If we choose a behavior the specs leave open, label it as our choice, not as a standard.
- Theme only through semantic `--dui-*` CSS custom properties. Do not hard-code colors, spacing, typography, or other design values in components.

The default theme should look complete and consistent out of the box. Consumers re-theme the system by overriding those tokens.

## Dependencies

The published CSS and web components have no runtime dependencies. Every external dependency (npm packages in the
root and in each demo app, GitHub Actions and container images) comes with a security review and a row in
[`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md), in the same pull request. `npm run lint:deps` (part of `npm test`
and CI) fails when one is missing or when a row names something no longer used.

## Checks

`npm test` must pass. That run includes html-validate, axe, and stylelint. On Linux it also compares the screenshot baselines.

## Screenshot baselines

`tests/visual.spec.js` records Chromium screenshots of the docs home and the button, field, card, dialog (open), data table, nav and app shell examples. Each page is shot at 1280×800 and 390×844, in light, dark and [forced colors](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors). The two widths are the reflow check from [WCAG 2.2 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Comparisons use Playwright's [`toHaveScreenshot()`](https://playwright.dev/docs/test-snapshots).

Baselines live in `tests/__screenshots__/`. They are Linux images. On any other operating system the spec skips unless `VISUAL=1` is set, so a macOS `npm test` does not fail on font rendering. Update the baselines in the same pull request as the visual change. On Linux:

```bash
npm run test:visual:update
```

To match the CI browser, run that in the Playwright image named in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (the tag matches `@playwright/test` in `package.json`):

```bash
docker run --rm -v "$PWD":/work -w /work -u "$(id -u):$(id -g)" mcr.microsoft.com/playwright:v1.65.1-noble bash -lc "npm ci && npm run test:visual:update"
```

A prebuilt theme adds an entry to `themeScopes` in the spec and commits the new images with the same command.

## Alignment passes

To check or fix how items line up (sidebars, nav, toolbars, menus, tabs, dialogs, tables, page headers), use the
vendored [gridlines](https://github.com/pritamux/gridlines) skill: read
[`.claude/skills/gridlines/DOMESTIC-UI.md`](.claude/skills/gridlines/DOMESTIC-UI.md) first, then
[`.claude/skills/gridlines/SKILL.md`](.claude/skills/gridlines/SKILL.md). Its rules are our choice, not a standard;
the target lines are in [`PRINCIPLES.md` § 13](PRINCIPLES.md#13-edges-and-alignment). Measure with
`npm run gridlines -- examples/app-shell.html` (a manual tool, not part of `npm test`).

## Commits and PR titles

Every commit follows [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/):
`type(scope): description`, lowercase.

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- The scope is optional and free-form lowercase, for example `css`, `tokens`, `examples`, `web-components`,
  `docs`, `demos`, `ci` or `deps`.
- The description starts lowercase (a proper noun later in the line is fine) and the whole header is at most 100
  characters. Mark a breaking change with `!` after the type or scope, or a `BREAKING CHANGE:` footer.

```text
feat(css): add toolbar density tokens
fix(nav): keep the marker on aria-current
docs: link the apg tabs pattern
```

We squash-merge, so the pull request title becomes the commit on `main`: the title must follow the same rule.
CI's `commits` job lints the title and every commit in the pull request with commitlint
([`commitlint.config.mjs`](commitlint.config.mjs)), and the required `ci` check fails if it does. Retitling a pull
request re-runs CI. Merge commits such as "Merge branch 'main' into …" are ignored. To check a message locally:
`echo "fix(nav): keep the marker on aria-current" | npx commitlint`.

## Changelog

`CHANGELOG.md` is generated from the commits on `main` by `npm run changelog` ([git-cliff](https://git-cliff.org/),
[`cliff.toml`](cliff.toml)) at release time. Never edit it by hand, and do not add changelog entries in pull
requests: the commit message is the entry. `npm run changelog:check` fails if the file is out of date. The section
written by hand before Conventional Commits is kept as it is.

### Versioning

Versions follow [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). These are the public API, and
changing or removing any of them is a breaking change:

- semantic tokens and knobs in `css/tokens/semantic.css` (primitives in `css/tokens/primitives.css` are internal and
  may change in any release);
- each component's `data-<component>` attribute and its words (`data-button="secondary small"`);
- the scope attributes `data-theme`, `data-color-scheme`, `data-density`, `data-motion` and `data-contrast`, and their
  values;
- the markup contract of each component: which native elements, attributes and ARIA states it expects;
- custom element names, their attributes, properties, methods and events (`dui-*`);
- every file path under `css/` and `web-components/`;
- the names of the snippets in `examples/`.

Breaking also covers raising the supported browsers so that one of them loses the core look, and retiring a web
component. A breaking change is marked with `!` or a `BREAKING CHANGE:` footer and merges only with the
maintainer's approval.

- **Before 1.0:** a breaking change bumps the minor version (0.x.0); everything else bumps the patch.
- **Deprecation:** a deprecated token, attribute word or element keeps working for at least one minor release, is
  marked **Deprecated** in its documentation with its replacement, and is removed in a later minor release.
- **Visual changes** to the default theme are not breaking, but release notes call them out and the screenshot tests
  cover them.
- **1.0** comes when the semantic tokens, the attribute vocabulary and the web component APIs have gone one full minor
  release with no breaking change, every component has a docs page in MDN structure, and the four framework demos pass
  the shared accessibility checks. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) has the reasoning.

### Releasing

Versions follow [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html), and the changelog follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Releases happen only when the maintainer asks.

1. Open a `chore(release): prepare X.Y.Z` pull request that sets `version` in `package.json` (and
   `package-lock.json`, with `npm version X.Y.Z --no-git-tag-version`) and runs
   `npm run changelog -- --tag vX.Y.Z`. That files every unreleased commit under `X.Y.Z` before the tag exists
   (git-cliff [`--tag`](https://git-cliff.org/docs/usage/args)) and leaves an empty `[Unreleased]` above it. Commit
   its output unedited. `npm run changelog:check -- --tag vX.Y.Z` checks it.
2. git-cliff dates the new section today (UTC), so generate it on the day the pull request merges, and regenerate
   it if the merge slips to another day.
3. After it merges, create an annotated tag on the merge commit on `main` and push it:
   `git tag -a vX.Y.Z -m "vX.Y.Z" <merge-sha> && git push origin vX.Y.Z`. From then on, plain
   `npm run changelog` and `npm run changelog:check` see the tag and produce the same section.
4. Publish a GitHub release named `vX.Y.Z` from that tag, with the `X.Y.Z` changelog section as its notes.
