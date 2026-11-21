# Gridlines in domestic-ui

Read this before `SKILL.md`. `SKILL.md`, `probe.js` and `audit.mjs` are upstream and unmodified
(see `UPSTREAM.md`); this file says how they apply in this repository, and wins where they differ.

## What the rules are here

- The skill's rules come from Karri Saarinen's redraw of the Linear sidebar and Apple's HIG layout chapter, not
  from W3C or WHATWG specifications. In this repository they are **Our choice** and must be labeled that way
  wherever they surface: CSS comments, `PRINCIPLES.md`, pull requests, the changelog. Standards win any conflict:
  WCAG 2.2 AA, the APG patterns and native elements come first.
- The "design policy" the skill reads first and records new lines in is
  [`PRINCIPLES.md` § 13 Edges and alignment](../../../PRINCIPLES.md#13-edges-and-alignment). Use its lines as the
  target; change them only with the owner's approval.
- Our box-line convention differs from the skill's tab rule: boxes sit on the container's content edge and labels one
  control padding in; we never pull a tab strip or a row outside its container (see the policy for why).
- The macOS window-controls rule (centre the top bar on the traffic lights) does not apply: web pages have no
  traffic lights. Everything else applies.

## How lines are written

- In `--dui-space-*` (and the other semantic) tokens with logical properties (`padding-inline-start`, not `left`
  or `padding-left`), never px literals. If a line needs a value off the scale, the container's padding is wrong,
  not the scale.
- Fix in container padding or a rule shared by a whole kind of row, never with a per-item nudge.
- Never shrink a target below 24 by 24 CSS px
  ([2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)), a control
  below `--dui-size-control`, or a focus outline or its offset to close a gap. Leave the gap and note its size.
- Transparent borders stay: nav links, list-detail rows and selectable table rows carry a transparent leading border
  that becomes the current or selected marker and is drawn in `Highlight` in forced-colors mode. Do not take one back
  with a negative margin (the skill's "invisible borders count" rule) unless you check the forced-colors rendering
  afterwards; prefer matching it with padding on the rows that lack it.
- No markup, behavior, colour, type or radius changes in a pass.

## Measuring

- `npm run gridlines -- <page> [widths] [prep.mjs]` runs `audit.mjs` with this repository's Playwright
  (`PW_DIR` is the repo root) against `scripts/serve.mjs`, which it starts on a free port. Widths default to our
  review widths, **1280 and 390**; add 1440 when the skill's own view needs it. Captures go to `.gridlines/`
  (gitignored). Open menus, popovers, dialogs and drawers with a `prep.mjs`; pass
  `CONTAINERS='dialog[open], [popover]:popover-open, [role="menu"]'` to measure them, since the probe's defaults
  do not include native `<dialog>` or `[popover]`.
- The wrapper works around three probe blind spots, in the measured page only: text in `.visually-hidden` and in
  closed `<details>` is skipped, and `aria-hidden="true"` is removed from `<svg>`s so decorative icons are measured.
- Rows the probe flags that are not misses: prose that wraps, items in the middle of a row (a search field), cells
  of a multi-column table, and 1 to 2px "vertical-centre" spreads between a checkbox and text (the text's
  content area, not its line box).
- Rows the probe misses: it starts a label at its text node's first rendered character, which can be a space (a
  `<summary>` keeps the space between its inline icon and its text; a flex link drops it). Confirm label lines from
  the first glyph when a row's icon is inline.
- The probe measures in **Chromium** only and assumes **left-to-right**. Also check WebKit and Firefox (by eye, or
  with Playwright's `webkit` and `firefox`), and say in every report that `dir="rtl"` is not covered.
- The examples' page chrome (the `domestic-ui` header nav) is styled by each page's inline `<style>`, not by `css/`;
  report its misses but do not fix them in a pass over `css/`.
