# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Semantic token names and file paths under `css/` are public API; primitive tokens are not.

## [Unreleased]

### Added

- `css/domestic.css`: zero-build entry point declaring
  `@layer reset, tokens, base, layout, components, utilities;` and importing each layer file.
- `reset` layer: a modest modern reset (`css/reset/reset.css`).
- `tokens` layer: primitive tokens (`css/tokens/primitives.css`) and semantic tokens
  (`css/tokens/semantic.css`), all prefixed `--dui-`, with `light-dark()` colors,
  a fluid `clamp()` type scale, spacing, radii, focus and motion tokens that collapse
  under `prefers-reduced-motion`.
- Theme scoping with `[data-theme]` or `.theme-*`, and scheme forcing with
  `data-color-scheme="light" | "dark"`.
- `base` layer: styles for text, links, lists, quotes, code, media, tables, form controls,
  buttons, `<dialog>`, `<details>`, visible `:focus-visible` and forced-colors support.
- `layout` layer: `.stack`, `.cluster` and `.grid` primitives configured with custom properties.
- `utilities` layer: `.visually-hidden`.
- Placeholders for `css/components/` and `web-components/`.
- `examples/base.html` and `examples/theming.html`.
- `PRINCIPLES.md`, including the semantic token reference.
- Tooling: html-validate, Stylelint, a token discipline check, and Playwright + axe-core
  accessibility tests in light and dark, all run by `npm test`.
- GitHub Actions: CI on pull requests and pushes to `main`, and a GitHub Pages skeleton.
- Atoms in `css/components/atoms/`, imported into the `components` layer, each with one attribute API:
  - Text helpers: `data-text="lead | small | muted"`.
  - Quiet link: `data-link="quiet"` (inherits text color, keeps its underline).
  - Buttons: `data-button="[primary | secondary | quiet] [small | large]"` on `<button>`, `<input>`
    and `<a href>`; `aria-disabled="true"` and `aria-busy="true"` states; an inner focus ring on
    primary buttons. `type="submit"` stays primary by default.
  - Switch: `role="switch"` on `<input type="checkbox">`, per the APG Switch pattern, with
    forced-colors support.
  - Field: `data-field` with `data-field="hint"` and `data-field="error"`; invalid style for
    `aria-invalid="true"` and `:user-invalid`.
  - Badge: `data-badge="neutral | accent | success | warning | danger"`.
- Semantic tokens: `--dui-color-warning`, `--dui-color-accent-surface`, `--dui-color-success-surface`,
  `--dui-color-warning-surface`, `--dui-color-danger-surface`, `--dui-tint-amount`, `--dui-border-tint-amount`,
  `--dui-size-target-small`, `--dui-size-target-large` (and their primitives).
- `examples/atoms/`: an index and one page per atom; the theming example now shows atoms in both themes.
- Tests: atom states through Playwright accessibility APIs, rendered focus-ring contrast on every
  button variant, contrast pairs for every new token, and scoped theming of atoms.
- Firefox and WebKit Playwright projects alongside Chromium, installed in CI.
- `layout` layer: `data-scroll="inline"` (`css/layout/scroll.css`), a keyboard-focusable scroll
  container for wide content such as data tables, used on a `<section>` named by the table caption (a region landmark).
- Tests: `tests/mobile.spec.js` checks every example at 320×640 and 375×812 in Chromium, Firefox
  and WebKit for horizontal page overflow and axe violations.
- Molecules in `css/components/molecules/`, imported into the `components` layer after the atoms,
  each documented in its file header (API, example, keyboard, specs) and indexed in
  `css/components/molecules/README.md`:
  - Disclosure and accordion (`disclosure.css`): native `<details>`/`<summary>`, exclusive groups with
    `name`; `data-disclosure="accordion | plain"`.
  - Dialog and drawer (`dialog.css`): header/body/footer layout and open transition for `<dialog>`;
    `data-dialog="drawer [start | end]"`; invoker commands and `closedby`; `@starting-style` with a
    no-transition fallback.
  - Popover and tooltip (`popover.css`): `data-popover="[block-start | inline-start | inline-end]"`,
    anchored with CSS anchor positioning inside `@supports` (bottom-center fallback); tooltips are
    `role="tooltip"` on `popover="hint"`.
  - Navigation list (`nav.css`): `data-nav="vertical | horizontal"`, `aria-current="page"`, `<details>` groups.
  - Breadcrumb (`breadcrumb.css`): `data-breadcrumb`, separators with empty alternative text.
  - Tabs (`tabs.css`): styles for `role="tablist" | "tab" | "tabpanel"`.
  - Menu button (`menu-button.css`): items of a `<dui-menu>` popover.
  - Toolbar (`toolbar.css`): `role="toolbar"`, `aria-orientation`, `aria-pressed` toggles.
  - Pagination (`pagination.css`): `data-pagination`, `aria-current="page"`, placeholder links for disabled ends.
  - Search field (`search.css`): the native `<search>` element around a search form.
  - Card (`card.css`): `data-card` and `data-card="link"` (heading link stretched over the card).
  - Alert and toast (`alerts.css`): `data-alert="info | success | warning | danger"` with a text prefix and
    an icon; `data-alert="toasts"` region; live region guidance.
- Web components in `web-components/`, light DOM, progressive enhancement, no dependencies:
  `<dui-tabs>` (APG Tabs from in-page links and sections; `aria-current="true"` on the link selected on
  load, swapped for `aria-selected` on upgrade; automatic or manual activation; RTL),
  `<dui-menu>` (APG Menu Button keyboard on a popover), `<dui-toolbar>` (roving tabindex),
  `<dui-tooltip>` (show on hover and focus, Esc to hide; stands in for `interestfor`) and
  `<dui-toaster>` (`show()` and `dismiss()` for a toast region, no auto-dismiss).
- Explainers in `explainers/` for the custom patterns: card, pagination, drawer and toast, plus an index.
- Semantic tokens: `--dui-color-info`, `--dui-color-info-surface`, `--dui-color-surface-inverse`,
  `--dui-color-text-inverse`, `--dui-border-width-indicator`, `--dui-size-menu-min`, `--dui-size-drawer`
  (and primitives `--dui-border-3`, `--dui-size-12`, `--dui-size-24`).
- `examples/molecules/`: an index and one page per molecule; the theming example now shows a breadcrumb,
  an alert, tabs and a card in both themes; "Molecules" links in the example navigation.
- Tests (`tests/molecules.spec.js` and additions to the existing specs): APG keyboard behavior for tabs,
  menu button, toolbar, dialog and drawer, popover, tooltip, disclosure and nav groups; ARIA states through
  accessibility APIs; no-JavaScript fallbacks; fallback paths for anchor positioning, `@starting-style`,
  `closedby` and `popover="hint"`; rendered indicator and focus-ring contrast; contrast pairs for every new
  token; scoped theming of molecules. The axe test now also checks open popovers and menus, every tab,
  shown tooltips and toasts, and waits for transitions to finish.
- `PRINCIPLES.md`: molecule choices, new semantic tokens, and "Web components" and "Explainers" sections.
- Motion tokens: `--dui-motion-scale` (multiplies every duration), `--dui-motion-movement` (1 lets things
  slide, lift and zoom; 0 keeps fades only), `--dui-motion-enabled` (0 under `data-motion="none"`),
  `--dui-motion-duration-fast | normal | slow`, `--dui-motion-easing-standard | enter | exit`,
  `--dui-motion-distance` and `--dui-motion-zoom`; new primitives `--dui-duration-350`,
  `--dui-easing-decelerate`, `--dui-easing-accelerate`, `--dui-factor-0`, `--dui-factor-1` and `--dui-ratio-95`.
- `data-motion="reduced"` (same as `prefers-reduced-motion: reduce`) and `data-motion="none"` (every
  duration `0s`) on any element; an empty `data-motion` scopes your own `--dui-motion-*` overrides.
- View transitions started by your own script use the motion tokens (inside `@supports`); domestic-ui
  starts none.
- Elevation scale: `--dui-elevation-0` to `--dui-elevation-4` (shadows) and `--dui-elevation-0-surface` to
  `--dui-elevation-4-surface` (lighter tonal surfaces in the dark scheme via `light-dark()` and
  `color-mix()`), role tokens `--dui-elevation-flat | raised | overlay | popover | dialog` and their
  `-surface` twins, and theme knobs `--dui-elevation-shadow-color`, `--dui-elevation-strength` and
  `--dui-elevation-surface-step`; new shadow-geometry primitives `--dui-shadow-1-key` … `--dui-shadow-4-ambient`,
  `--dui-shadow-none`, `--dui-mix-3` and `--dui-mix-100`.
- `examples/motion.html` and `examples/elevation.html`, linked from the example navigation, with docs pages
  `principles/motion.html` and `principles/elevation.html`.
- `PRINCIPLES.md`: "Motion" and "Elevation" sections (later sections renumbered) and the new semantic tokens.
- Tests (`tests/motion-elevation.spec.js` and additions to `tests/tokens.spec.js`): every element on every
  example page has `0s` transition and animation durations under `data-motion="none"`, with dialogs,
  drawers, popovers, menus, details and toasts open; reduced motion (media query and `data-motion="reduced"`)
  has no movement transition but keeps the fades; `--dui-motion-scale` multiplies durations on a
  descendant scope; axe on the new pages; contrast of text, muted text, links, control borders and the
  focus ring on every elevation surface in light and dark, default and forest themes; borders in forced
  colors; `--dui-shadow-raised` equals level 1.
- Combobox (typeahead) molecule: `<dui-combobox>` (`web-components/dui-combobox.js`) upgrades a native
  `<input list>` + `<datalist>` to the APG Combobox list autocomplete pattern (`role="combobox"`,
  `aria-expanded`, `aria-controls`, `aria-activedescendant`, a `role="listbox"` built from the datalist
  options), keeping the same input; case-insensitive "contains" filtering; a polite `role="status"` result
  count; a cancelable `dui-combobox-filter` event and `setOptions()` for options loaded by the page;
  `change` on the input when an option is accepted. Styles in `css/components/molecules/combobox.css`
  (popover elevation, fade and zoom with the motion tokens, forced colors). `examples/molecules/combobox.html`,
  `explainers/combobox.md`; the typeahead docs page now shows it live.
- Density: `data-density="compact"` on any element tightens control heights (44px to 32px), padding, gaps and
  table cells inside it, with the same text size and every target at least 24 by 24 CSS pixels;
  `data-density="comfortable"` (the default) restores them. Semantic tokens `--dui-density-scale` (the knob),
  `--dui-size-control`, `--dui-space-control-block`, `--dui-space-control-inline`, `--dui-space-button-inline`,
  `--dui-space-gap`, `--dui-space-gap-tight` and `--dui-space-cell`, re-derived on every `[data-density]`
  scope. `examples/patterns/density.html` (linked from the example navigation), `explainers/density.md`;
  the density docs page now shows it live.
- `--dui-size-page`: the max inline size of a page's content column, `72rem` (primitive `--dui-size-72`).
- Tests: `tests/combobox.spec.js` (APG keyboard and ARIA, filtering, live region, filter event and
  `setOptions()`, form submission, no-JavaScript fallback, axe with the list open, 320px, motion) and
  `tests/density.spec.js` (compact vs comfortable computed sizes, 24px targets, unchanged font sizes,
  nested scopes, `--dui-size-page`). The axe and `data-motion="none"` checks now also open every combobox.
- Page layouts in `css/layout/` (M3b), each one attribute on a wrapper, side by side when the wrapper is
  wide and stacked when it is narrow, switched by a container query on the wrapper:
  - List-detail (`list-detail.css`): `data-list-detail`, a `<nav>` of links with `aria-current` on the
    selected one beside a labelled detail that sticks and scrolls on its own when side by side (40rem).
  - Split (`split.css`): `data-split="[1:1 | 1:2 | 2:1]"`, two regions at a ratio (40rem); no draggable
    divider, see `explainers/split-view.md`.
  - Dashboard (`dashboard.css`): `data-dashboard` on a grid of headed tiles on raised surfaces that reflows
    with `repeat(auto-fit, minmax())`; `data-dashboard="wide"` (two columns when they fit) and
    `data-dashboard="full"` on a tile.
  - Sticky action bar (`action-bar.css`): `data-action-bar` on the last child of a `<form>`; sticks to the
    bottom of the scroll area, and every ancestor of the form reserves its height with
    `scroll-padding-block-end` so the focused field is never under it (WCAG 2.4.11, technique C43).
  - A settings page composed from list-detail, form sections and the action bar (no new API).
- Organisms in `css/components/organisms/` (M3b), imported into the `components` layer after the molecules
  and indexed in `css/components/organisms/README.md`:
  - Page header (`page-header.css`): `data-page-header` on a `<header>`: breadcrumb, heading, description and
    actions that sit beside the title from 40rem and wrap under it below.
  - Filter bar (`filter-bar.css`): `data-filter-bar` on `<search>` > `<form method="get">` with labelled
    controls (a `<dui-combobox>` works), Apply and Reset, and a `role="status"` result count present from load.
  - Form sections (`large-forms.css`): `data-form-sections` on a `<form>`; each `<section>` has a `<header>`
    and one body of fields, laid out heading-beside-fields with a field grid from 48rem.
- `--dui-size-pane`: the max block size of a pane that scrolls on its own, `100svh` (primitive `--dui-size-100svh`).
- `examples/layouts/` (index, list-detail, split, dashboard, action-bar, settings) and `examples/organisms/`
  (index, page-header, filter-bar, large-forms), with compact-density demos; the example navigation links
  the two new indexes. `explainers/split-view.md`.
- Tests: `tests/layouts.spec.js` (side by side at 1280px and stacked at 360px for every layout, split ratios,
  dashboard spans, list-detail `aria-current` and Tab order, the detail pane, the sticky action bar and focus
  never under it, in the page and in a scrolling pane) and `tests/organisms.spec.js` (page header, filter bar
  status and labels, form sections, and every target at least 24 by 24 CSS pixels under
  `data-density="compact"` on all the new pages).
- Data table organism (`css/components/organisms/data-table.css`, M3b): `data-table` on a native `<table>` with
  a caption and `th[scope]`; `data-table="sticky"` for a header that sticks to its scroll container;
  `data-table="number"` on the cells of numeric columns (end-aligned, tabular figures); separate cell borders so
  the header's border moves with it; row selection with a highlight that is not color alone; an empty-state row
  (one `<td colspan>`); a loading state (`aria-busy="true"` with `aria-hidden` skeleton rows whose shimmer stops
  under reduced motion and `data-motion="none"`).
- `<dui-table>` (`web-components/dui-table.js`): sortable columns after the APG Sortable Table example (header
  text upgraded to buttons, `aria-sort` on the sorted header only, a caption hint, number, ISO date and
  `data-sort-value` aware, stable) with a cancelable `dui-table-sort` event; row selection with a "select all"
  checkbox (mixed when some rows are selected), a count in a `role="status"` element and bulk actions in a
  toolbar disabled while nothing is selected.
- `data-scroll="block inline"` (`css/layout/scroll.css`): the container also scrolls vertically, at most
  `--dui-size-pane` tall, so a sticky table header stays in view.
- `examples/organisms/data-table.html` (sortable, selection and bulk actions, empty, loading, wide with a sticky
  header) and a data table on the organisms index; `tests/data-table.spec.js` (sorting by click and keyboard,
  numbers, dates, stability, the event and canceling it, no-JavaScript fallback with axe, selection count,
  select all and its mixed state, unique checkbox names, the sticky header, loading and the shimmer under
  `data-motion="none"` and reduced motion, 320px, axe and 24px targets in compact density).
- App shell layout (`css/layout/app-shell.css`, M3b): `data-app-shell` on a wrapper holding a `<header>` (app bar),
  a primary sidebar (a labelled `<nav>`, or an `<aside>` holding it), `<main>`, an optional auxiliary `<aside>` and
  an optional `<footer>`, placed with named grid areas (`header`, `start`, `main`, `end`, `footer`) and switched by
  container queries on the shell (primary sidebar beside main from 48rem, auxiliary from 64rem; stacked in source
  order below). Sidebars beside main stick and scroll on their own (at most `--dui-size-pane`); collapsing animates
  the grid columns with the motion tokens (instant under reduced motion and `data-motion="none"`). `<main>` and
  each sidebar are named size containers (`dui-app-shell-main`, `-start`, `-end`). `data-app-shell="contained"`
  for a shell inside a page section. Without JavaScript both sidebars are always visible and the toggles stay
  `hidden`.
- `<dui-app-shell>` (`web-components/dui-app-shell.js`): sidebar toggles (`aria-controls`, `aria-expanded`) that
  collapse a sidebar beside main with `hidden`, or open it in a modal drawer (`<dialog data-dialog="drawer start |
  end" closedby="any">` built once, with a heading and a Close button) on a narrow shell, moving the one copy of the
  sidebar in while it is open and back when it closes; Esc and backdrop close; focus returns to the opener; the mode
  follows the shell's own width (`ResizeObserver`); `aria-expanded="false"` in the markup starts a sidebar
  collapsed; `show()`, `hide()`, `toggle()`, `isDrawer()` and a `dui-app-shell-toggle` event.
- Sidebar navigation: the nav molecule (`data-nav="vertical"`) documented as the app shell's sidebar, with optional
  decorative `<svg aria-hidden="true">` icons in links and group summaries; a note on why it is not an APG Tree View
  (CSS header, molecules and organisms indexes, `PRINCIPLES.md`, `explainers/app-shell.md`).
- Semantic tokens `--dui-size-icon` (1.25rem), `--dui-size-sidebar` (16rem) and `--dui-size-sidebar-aux` (20rem);
  primitive `--dui-size-20`.
- `examples/app-shell.html`: a full orders screen (app bar with a `<dui-combobox>` search and a user menu, sidebar
  navigation with nested groups, page header, filter bar, sortable data table with selection and bulk actions, the
  selected order in the auxiliary sidebar, updated on selection or when an order link is activated);
  `examples/layouts/app-shell.html`: a contained shell. Every example page's navigation links the orders screen;
  the layouts index lists the app shell.
- `explainers/app-shell.md` and `explainers/aux-sidebar.md`.
- Tests: `tests/app-shell.spec.js` (landmarks and their names, grid areas at 1440px, collapse with click, Enter and
  Space, modal drawers at both edges with Esc and focus return, one copy of each sidebar in every mode, mode
  switches on the shell's own width, main as a size container, no-JavaScript and blocked-module fallbacks with axe
  and no overflow at 320px, sidebar navigation groups and current link, the orders screen's aux sidebar, combobox,
  filter bar, sorting and compact targets, motion); `tests/a11y.spec.js` also checks every app shell drawer open
  at 375px in light and dark; `tests/layouts.spec.js` checks the list-detail selected marker, also in forced colors.
- Code highlighting with the CSS Custom Highlight API, CSS only: `::highlight(dui-code-keyword | string | comment |
  tag | attribute | property | number | punctuation)` in `css/base/typography.css`, each colored by a new semantic
  token `--dui-color-code-*` (4.5:1 on `--dui-color-surface-sunken` in light and dark; `CanvasText` in forced
  colors). The page registers the ranges; without JavaScript code stays plain text. Primitives
  `--dui-color-teal-300` and `--dui-color-teal-700`. `explainers/code-highlighting.md` lists the names and what
  each covers; `tests/tokens.spec.js` checks each token's contrast.
- `<pre data-scroll="inline" tabindex="0" aria-label="...">` opts a code block in to scrolling along the inline
  axis with whole lines (`css/layout/scroll.css`, `examples/base.html`).
- Alignment passes: the MIT-licensed [gridlines](https://github.com/pritamux/gridlines) skill vendored unmodified in
  `.claude/skills/gridlines/` with `DOMESTIC-UI.md` (how it applies here), `npm run gridlines` (a manual tool, not a
  CI gate) and a new "Edges and alignment" section in `PRINCIPLES.md` naming each container's lines in tokens.

### Changed

- Headings: h2 is now `--dui-step-3` (was step-4), h3 `--dui-step-2`, h4 `--dui-step-1`, h5 and h6
  `--dui-step-0`, so section headings read as headings rather than display text; h1 stays `--dui-step-5`.
  A heading directly after another heading now sits `--dui-space-m` below it (was `--dui-space-xs`).
- Examples use `max-inline-size: var(--dui-size-page)` instead of a hard-coded `72rem`.
- Components read the density tokens instead of `--dui-size-target` and fixed spaces: text fields, selects,
  textareas, color inputs, check and switch labels, buttons and `a[data-button]`, `<summary>`, table
  cells, field gaps, tabs, nav, menu, pagination and toolbar. Values are unchanged at the default
  (comfortable) density.
- The molecules index no longer lists the combobox under "Not shipped".
- `<dui-toolbar>` keeps one Tab stop when its controls are enabled or disabled after it upgrades (a bulk-action
  bar).
- `--dui-size-pane` also bounds a `data-scroll="block inline"` container (description only; the value is unchanged).
- List-detail: the selected item's bar is now `--dui-border-width-emphasis` wide (was the 3px indicator width), as on a
  selected data table row; `aria-current` on the `<li>` marks its link too; in forced colors only the leading bar
  turns `Highlight`.
- The nav molecule's links have a gap between an icon and the text.
- The organisms index no longer lists the app shell and sidebar navigation as a later session; the components
  README lists the data table among the organisms.

- Components adopt the motion and elevation tokens: card uses the raised level (shadow added, surface
  `--dui-elevation-raised-surface`), popovers, menus, tooltips and nav dropdowns the popover level, toasts
  the overlay level, dialogs and drawers the dialog level (including the sticky drawer header). No
  component uses a literal duration, easing or shadow.
- Reduced motion now keeps opacity and color transitions and drops movement, instead of setting every
  duration to `0s`. Popovers and menus also grow from `--dui-motion-zoom`; drawers fade as they slide (and
  only fade with reduced motion); enter and exit use their own easings.
- Text fields no longer animate their border, so the invalid state shows at once.
- Smooth in-page scrolling is also off under `data-motion="reduced" | "none"` on the root.

- CI: lint, html-validate, the token check and `node site/build.mjs --check` run as a `lint` job, and the
  Playwright suite is split across eight shards (`--shard=i/8`) in the Playwright container. A final job
  named `ci` passes only when all of them pass, so the required check keeps its name.

- `<pre>` wraps long lines by default (`white-space: pre-wrap; overflow-wrap: break-word`) instead of scrolling,
  so a code block reflows at 320px with no extra focus stop. Only a `<pre data-scroll="inline">` needs
  `tabindex="0"` and an accessible name; `tests/mobile.spec.js` checks those instead of `tabindex` on every
  `<pre>`.
- Example snippets are working code only: explanatory comments inside `dui:snippet` blocks were removed
  (one, in `examples/elevation.html`'s "Level swatch CSS").

### Deprecated

- `--dui-shadow-raised` (now `var(--dui-elevation-1)`; use `--dui-elevation-raised`),
  `--dui-duration-fast` (use `--dui-motion-duration-fast`), `--dui-duration-normal` (use
  `--dui-motion-duration-normal`) and `--dui-easing-standard` (use `--dui-motion-easing-standard`). Each is
  an alias of its replacement and is removed in the next release.

### Fixed

- Alignment pass (`PRINCIPLES.md`, Edges and alignment): in a vertical nav, a link beside a group starts its icon
  and label on the group's line (`--dui-space-m` further in), instead of 16px before it; a menu panel takes its
  `--dui-space-gap-tight` padding, which popover.css used to override, so item labels sit on the popover text line;
  a data table's "select all" checkbox centers on the row checkboxes' column (2px further in).
- Colored leading edges are straight: alerts, the current nav link, the selected list-detail item and
  data table row, invalid fields and `<blockquote>` set `border-start-start-radius` and
  `border-end-start-radius` to `0` (trailing corners stay rounded; RTL follows), so the edge no longer
  bends with the box's `border-radius`. `tests/leading-edge.spec.js` checks every example in LTR and RTL.
- Pages no longer scroll sideways on small screens (320px and up). Inline `code`, `kbd`, `samp`
  and links in running text wrap with `overflow-wrap: anywhere`, long words in headings break,
  `.cluster` and `.grid` children get `min-inline-size: 0`, badges wrap (a wrapped badge keeps
  rounded corners), table cells use `--dui-space-xs` padding on every side, and every example
  table sits in a `data-scroll="inline"` region. Code blocks wrap (see Changed); one that opts in to
  `data-scroll="inline"` has `tabindex="0"` (axe `scrollable-region-focusable`).

- Base button hover and press styles no longer apply to buttons with `aria-disabled="true"`.

[Unreleased]: https://github.com/odonckers/domestic-ui/commits/main
