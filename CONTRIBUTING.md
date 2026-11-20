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

## Changelog

Every user-facing change needs an entry in `CHANGELOG.md`.
