# Contributing to domestic-ui

Thanks for helping. This project is a design system built on native HTML, CSS tokens, and published web standards.

## Issues and pull requests

Use the issue forms for bugs and feature requests. Pull requests should use the template.

Branch names follow `fix/short-description`, `feat/short-description`, `docs/short-description`, or `a11y/short-description`.

### Approval flow

Issues and pull requests from outside this repository's owners, members, or collaborators get the `needs-owen-approval` label automatically.

The maintainer approves an item by adding the `owen-approved` label. Only Owen applies that label. Team bots never apply `owen-approved` and never merge outside pull requests. Bots may merge their own pull requests.

An outside pull request cannot merge until the `owen-gate` check passes, which requires the `owen-approved` label.

`.github/CODEOWNERS` lists @odonckers on every file. That file is informational today: team bots push with the same GitHub account as Owen, so GitHub cannot tell his review apart from a bot's.

## Standards

- Prefer a native HTML element before adding a component or custom behavior.
- Cite the relevant [MDN](https://developer.mozilla.org/), [WHATWG](https://whatwg.org/), [W3C](https://www.w3.org/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), or [APG](https://www.w3.org/WAI/ARIA/apg/) documentation in the issue or pull request.
- If we choose a behavior the specs leave open, label it as our choice, not as a standard.
- Theme only through semantic `--dui-*` CSS custom properties. Do not hard-code colors, spacing, typography, or other design values in components.

The default theme should look complete and consistent out of the box. Consumers re-theme the system by overriding those tokens.

## Checks

`npm test` runs, in order, and fails if any step fails:

| Script | Tool | Checks |
| --- | --- | --- |
| `lint:html` | [html-validate](https://html-validate.org/) | `examples/**/*.html` against `html-validate:recommended` |
| `lint:css` | [Stylelint](https://stylelint.io/) | `css/**/*.css` against `stylelint-config-standard` |
| `lint:tokens` | `scripts/check-tokens.mjs` | Semantic-only tokens and no literal colors or sizes outside `css/tokens/` |
| `test:a11y` | [Playwright](https://playwright.dev/) + [axe-core](https://github.com/dequelabs/axe-core) | Every `examples/**/*.html` (atoms and molecules included) in light and dark, in Chromium, Firefox and WebKit, with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, including open dialogs and drawers, open popovers and menus, shown tooltips and toasts, every tab selected and every details expanded; no horizontal page overflow and no axe violations at 320×640 and 375×812; no external requests; token contrast pairs (atoms and molecules included) in the default and forest themes; rendered focus-ring and indicator contrast; atom and molecule states through accessibility APIs; molecule keyboard behavior against the APG; no-JavaScript fallbacks; fallbacks for engine-specific features; scoped theming of atoms and molecules; layouts and organisms side by side when wide and stacked when narrow, the sticky action bar never covering the focused field, data table sorting, selection, sticky header and loading state (with and without JavaScript), and 24px targets in compact density; the app shell's landmarks and grid areas, collapse when wide, modal drawers with focus return when narrow, one copy of each sidebar, no-JavaScript fallbacks and axe with the drawers open |

Preview locally with `npm run serve` (a zero-dependency static server) and open
<http://127.0.0.1:4173/examples/base.html>. To run tests from two checkouts at once, give each its own port, e.g. `PORT=4273 npm test`.

Rule relaxations, each with its reason:

- **Stylelint `custom-property-pattern`** is replaced, not disabled. The standard kebab-case
  pattern rejects `--dui-step--1` (the double hyphen marks a negative step, a common naming for
  type scales below zero). The replacement still requires kebab-case and only allows names
  starting with `--dui-` or the documented layout properties (`--stack-*`, `--cluster-*`, `--grid-*`).
- **Engine-specific test**: the field test also reads the `invalid` state from the accessibility
  tree through the Chrome DevTools Protocol, which only Chromium offers; Firefox and WebKit run the
  rest of that test (attribute and accessible description). The molecule tests do the same for the
  expanded state of `<summary>` and of a `popovertarget` button, which browsers expose natively but
  Playwright's role engine does not compute; the other engines check the `open` attribute and the
  popover's visibility instead. No browser is skipped.
- **Feature fallbacks**: where every engine in the test run supports a feature (anchor positioning,
  `@starting-style`, `closedby`, `popover="hint"`), the molecule tests also exercise the fallback path
  by removing the feature in the page: deleting the `@supports` or `@starting-style` rules from the
  CSSOM, removing the `closedby` attribute, or setting `popover="manual"` (what `hint` falls back to).
- **Settling transitions**: axe and geometry checks wait for running CSS transitions to finish, so they
  measure final colors and positions rather than a frame mid-fade.
- **External-request check**: same-origin `blob:` URLs are allowed, because WebKit routes these
  in-memory objects through the request handler. Any other origin still fails the test.
- **html-validate**: none. `html-validate:recommended` is used as-is. Inline `style` attributes
  that set only custom properties are already allowed by its
  [`no-inline-style`](https://html-validate.org/rules/no-inline-style.html) default
  (`allowVariables: true`), which is how the layout primitives are configured.

## Alignment passes

To check or fix how items line up (sidebars, nav, toolbars, menus, tabs, dialogs, tables, page headers), use the
vendored [gridlines](https://github.com/pritamux/gridlines) skill: read
[`.claude/skills/gridlines/DOMESTIC-UI.md`](.claude/skills/gridlines/DOMESTIC-UI.md) first, then
[`.claude/skills/gridlines/SKILL.md`](.claude/skills/gridlines/SKILL.md). Its rules are our choice, not a standard;
the target lines are in [`PRINCIPLES.md` § 12](PRINCIPLES.md#12-edges-and-alignment). Measure with
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
