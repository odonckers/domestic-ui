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

`npm test` must pass. That run includes html-validate, axe, and stylelint.

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
