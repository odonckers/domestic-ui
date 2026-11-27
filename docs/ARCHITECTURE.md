# Architecture

How domestic-ui is put together, why, and where it is going. [PRINCIPLES.md](../PRINCIPLES.md) holds the
rules for individual elements and tokens; this file holds the structure those rules sit in.
[CONTRIBUTING.md](../CONTRIBUTING.md) wins if the two ever disagree.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## 1. The thesis

The web is a document platform. HTML already says what a thing is (`<button>`, `<dialog>`, `<nav>`,
`<table>`, `<details>`), CSS already says how it looks, and the browser already knows how it behaves
([WHATWG HTML](https://html.spec.whatwg.org/multipage/)). domestic-ui keeps those three apart and
adds as little as possible on top:

- **Markup is the API.** Correct, semantic HTML renders as a finished, modern interface with no class
  names and no styles written by the author. A few `data-*` attributes pick variants.
- **Tokens are the theme.** Every visual decision is a `--dui-*` custom property
  ([CSS Custom Properties](https://www.w3.org/TR/css-variables-1/)). A theme is a set of token values,
  never a new stylesheet.
- **JavaScript is the interaction and state layer only.** A handful of light-DOM custom elements add
  the behavior HTML has no element for, on top of markup that already works without them. Application
  state stays in the author's framework or script, which talks to the page only through attributes,
  properties and events.

Because the DOM is the contract, the same markup works from plain HTML, React, Angular, Astro or any
server template, and a person or a coding agent can write a whole view without writing CSS.

**Our choice:** we treat our own patterns as proposals for the platform. Where HTML lacks something,
we design the missing piece the way a WHATWG or [Open UI](https://open-ui.org/) proposal would be
designed (an [explainer](../explainers/README.md), native naming, native states), so that when the
platform ships it, our markup migrates by renaming at most. Nothing here is original; every borrowed
fact is cited.

## 2. The layers

Each layer owns one job and MUST NOT do the job of another.

| Layer | Lives in | Owns | Must not |
| --- | --- | --- | --- |
| Semantics | The author's HTML | What each thing is: native elements, native attributes (`open`, `disabled`, `popover`, `commandfor`, `hidden`), ARIA only where native can't | Carry presentation (no style attributes, no utility classes for looks) |
| Tokens | `css/tokens/` | Every value: color, type, space, size, radius, motion, elevation, density, contrast | Reference an element or component |
| Base | `css/base/` | Native elements as they are: type, forms, tables, media, interactive elements, focus | Need a class or attribute to look right |
| Layout | `css/layout/` | Arrangement: stack, cluster, grid, split, list-detail, dashboard, action bar, app shell | Change how a component looks inside it |
| Components | `css/components/{atoms,molecules,organisms}/` | Variants and compositions, one `data-<component>` attribute each | Hard-code a value or depend on script |
| Utilities | `css/utilities/` | Single-purpose helpers such as `.visually-hidden` | Grow into a utility-class framework |
| Behavior | `web-components/` | Keyboard models, focus management and state sync HTML cannot do | Render the markup, own application state, or add a styling API |

The CSS layers are [cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
declared once in `css/domestic.css` ([CSS Cascade 5](https://www.w3.org/TR/css-cascade-5/#layering)):
`reset, tokens, base, layout, components, utilities`. The author's own unlayered CSS beats all of
them. PRINCIPLES.md, section 4, has the details.

Atomic design ([Brad Frost](https://atomicdesign.bradfrost.com/chapter-2/)) names the component tiers:
atoms are single elements, molecules are small groups, organisms are page sections. **Our choice:** the
tiers are folders and docs sections, not separate APIs; every tier uses the same one-attribute rule.

## 3. The decision ladder

Every new need goes down this ladder and stops at the first rung that works. A pull request that skips
a rung says why.

1. **A native element** with the semantics and behavior already
   ([first rule of ARIA use](https://www.w3.org/TR/using-aria/#rule1)). Style it in `base`.
2. **A native attribute or CSS feature** on that element: `popover`, `commandfor` and `command`,
   `name` on `<details>`, `closedby`, `:has()`, container queries, anchor positioning.
3. **An [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) that needs no script**: markup and
   CSS only, ARIA only as [ARIA in HTML](https://www.w3.org/TR/html-aria/) allows.
4. **A light-DOM web component** that upgrades markup from rungs 1 to 3 and adds only the missing
   behavior, following the APG pattern exactly. Section 7 has the rules.
5. **An explainer** in `explainers/`, required when a pattern has neither a native element nor an
   APG pattern. It is written as a platform proposal (section 8).

Rejected outright: wrapper `div`s or classes for base elements, Shadow DOM components, a second
styling API, and anything that needs a build step to use.

## 4. Public API and naming

These surfaces are the public API. Changing or removing any of them is a breaking change (section 10).

| Surface | Convention | Example | Where it is documented |
| --- | --- | --- | --- |
| Semantic tokens | `--dui-<category>-<role>[-<variant>]`, lowercase, no abbreviations | `--dui-color-surface-raised`, `--dui-size-control` | PRINCIPLES.md, section 5 |
| Knobs | Unitless or percentage scalars named `-scale`, `-strength` or the input they control | `--dui-radius-scale`, `--dui-density-scale`, `--dui-contrast` | PRINCIPLES.md, sections 5 to 7 |
| Component attribute | One `data-<component>` per component; its value is a space-separated word list matched with `~=` | `data-button="secondary small"`, `data-dialog="drawer end"` | The header comment of the component's CSS file |
| Scope attributes | `data-<concern>` on any element, applying to its subtree | `data-theme`, `data-color-scheme`, `data-density`, `data-motion`, `data-contrast` | PRINCIPLES.md |
| State | Native attributes and ARIA only | `open`, `hidden`, `disabled`, `aria-current`, `aria-pressed`, `aria-expanded`, `aria-sort` | Each component |
| Custom elements | `dui-<name>`, one per file in `web-components/`, attributes in HTML naming (`activation="manual"`) | `<dui-tabs>`, `<dui-menu>` | The element's header comment and `web-components/README.md` |
| Events | `dui-<element>-<verb>`, bubbling; cancelable when the default can be replaced | `dui-table-sort`, `dui-combobox-filter` | `web-components/README.md` |
| File paths | Every file under `css/` and `web-components/` keeps its path | `css/domestic.css` | PRINCIPLES.md, section 2 |
| Example snippets | Named blocks in `examples/` | `examples/molecules/dialog.html` | The docs site |

Primitive tokens (`css/tokens/primitives.css`) are internal and MAY change in any release.

**Our choice:** names follow HTML and ARIA conventions (lowercase, whole words, state in native
attributes), so a pattern can map onto a future native element or attribute without renaming its
states. **Our choice:** no per-component public tokens (`--dui-button-bg`); a component reads semantic
tokens only, which keeps the theming surface small enough to learn in one sitting and lets one theme
restyle everything consistently.

## 5. Platform baseline

We build on the newest standards, but nobody's page may break because of them. The tiers use
[Baseline](https://web.dev/baseline) as tracked by the W3C WebDX Community Group's
[web-features](https://github.com/web-platform-dx/web-features) data, which MDN shows on every page.

| Tier | Meaning | How we may use it |
| --- | --- | --- |
| Baseline widely available | In every major engine for 30 months | Freely, for the core look and behavior |
| Baseline newly available | In every major engine, recently | For the core look, with a fallback that still renders correctly in the previous version of each engine |
| Limited availability | Missing in at least one engine | Only as progressive enhancement inside [`@supports`](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports) or feature detection; the page MUST look finished and work without it |

- **Our choice:** the supported browsers are the current and previous major versions of Chromium,
  Firefox and WebKit, the same three engines `npm test` runs in. That keeps us at the front of the
  platform while every user still gets a complete page.
- A JavaScript stand-in for a limited-availability standard is a **bridge**: it MUST use the standard's
  markup and names where it can, and it MUST name the condition that retires it (section 7).
- A CSS fallback is always preferred over a JavaScript polyfill.

## 6. Standards we build on

How each recent standard is used. "Status" is a summary as of November 2026; MDN's Baseline badge on
the linked page is the source of truth.

| Standard | Status | How domestic-ui uses it | Without it |
| --- | --- | --- | --- |
| [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) and `showModal()` | Widely available | Dialogs and the drawer variant; focus, <kbd>Esc</kbd> and inertness come from the browser | n/a |
| [`popover`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover) | Baseline | Menus, popovers, the tooltip's `popover="hint"`, nav dropdowns, in the top layer | n/a |
| [Invoker commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) (`commandfor`, `command`) | Newly shipped in all engines | Open and close dialogs and popovers with no script | The buttons do nothing; a page that must support an older engine adds a one-line `showModal()` or `togglePopover()` handler |
| [`closedby`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby) | Limited | Light dismiss for dialogs | <kbd>Esc</kbd> and the close button still work |
| [`<details name>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details#name) | Baseline | Exclusive accordions | n/a |
| [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) | Baseline | Parent state: a field with an invalid input, a row with a checked box, a shell with an open sidebar | n/a |
| [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) | Widely available | Layouts respond to their container, not the viewport (split view, list-detail, app shell) | n/a |
| [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) and [`color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme) | Baseline | Every semantic color has a light and a dark value | n/a |
| [OKLCH](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch), [relative colors](https://www.w3.org/TR/css-color-5/#relative-colors), [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) | Baseline | Color ramps, derived hover and tint tokens, the contrast knob | n/a |
| [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) | Baseline | Non-inheriting layout custom properties | n/a |
| [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) and `transition-behavior: allow-discrete` | Newly available | Top-layer enter and exit transitions | Elements open and close with no transition |
| [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) | Newly shipped in all engines | Popovers placed beside their invoker with `position-area` and `position-try-fallbacks` | Inside `@supports`; popovers sit centered at the bottom of the viewport instead |
| [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) | Newly available | Code highlighting with `::highlight()` and token colors | Plain code |
| [View transitions](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | Same-document newly available; cross-document limited | Optional page cross-fades driven by motion tokens | Instant navigation |
| [Customizable `<select>`](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select) (`appearance: base-select`) | Limited (Chromium) | Planned: a fully styled select with icons in options | The native select, tinted and sized by tokens |
| [Interest invokers](https://open-ui.org/components/interest-invokers.explainer/) (`interestfor`) | Limited (Chromium) | Planned replacement for `<dui-tooltip>` and hover cards | `<dui-tooltip>` bridges it |
| [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) | Newly shipped in all engines | Under evaluation for theme and density scopes (proximity) | Attribute selectors as today |
| [Custom element states](https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet) (`:state()`) | Baseline | Planned: web components expose internal state to CSS without inventing attributes | n/a |
| [`field-sizing: content`](https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing) | Limited | Auto-growing text areas | A fixed-height, resizable text area |
| [`focusgroup`](https://open-ui.org/components/focusgroup.explainer/) | Proposal (Open UI) | Watched: would replace the roving tabindex in `<dui-toolbar>`, `<dui-tabs>` and `<dui-menu>` | The web components |

A tracking issue keeps this table current, and each "planned" row has its own issue on the roadmap.

## 7. Web components

`web-components/README.md` has the rule and the index. In short, every element:

- exists only because HTML or CSS cannot do the job, and its header comment says what;
- upgrades markup that already renders and works with JavaScript off
  ([progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement));
- uses the light DOM, so the component CSS styles it and there is one styling API;
- follows its APG pattern exactly and adds ARIA only together with the keyboard behavior it promises;
- reads its configuration from attributes, reports through native or `dui-*` events, and never holds
  application data that the page or framework should own;
- is one dependency-free ES module, loaded with `<script type="module">`.

**Bridges and successors.** Each element names the platform feature that would replace it, and the
condition that removes it. When the condition is met the element is deprecated for one minor release
and then removed, which is a breaking change (section 10).

| Element | What it adds | Platform successor | Retire when |
| --- | --- | --- | --- |
| `<dui-tooltip>` | Show a hint popover on hover and focus | [`interestfor`](https://open-ui.org/components/interest-invokers.explainer/) | `interestfor` is Baseline newly available |
| `<dui-combobox>` | Styled, filtered list autocomplete for `<input list>` | None for free-text autocomplete; [customizable select](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select) covers pick-one cases | Kept; pick-one uses move to `<select>` once base-select is Baseline |
| `<dui-toolbar>` | Roving tabindex | [`focusgroup`](https://open-ui.org/components/focusgroup.explainer/) | `focusgroup` is Baseline newly available |
| `<dui-tabs>` | APG Tabs keyboard and selection | `focusgroup` for keys; no tabs element is proposed yet | Keys move to `focusgroup`; the element stays for selection |
| `<dui-menu>` | APG Menu Button keyboard and typeahead | Open UI [menu elements](https://open-ui.org/components/menu.explainer/) proposal | A native menu element is Baseline newly available |
| `<dui-app-shell>` | Sidebar toggle state and the move into a drawer when narrow | Container queries cover layout; nothing covers moving one node into a modal | Kept |
| `<dui-table>` | Sorting, select-all, selection count | None proposed | Kept |
| `<dui-toaster>` | Toast stacking, dismiss and focus return | None active | Kept |

**Our choice:** no Shadow DOM, because a shadow root would need a second styling API (parts and
custom properties per component) and would hide the markup from page CSS and from agents reading it.

## 8. Proposing standards

Every explainer in `explainers/` is written as if it were headed to Open UI or the WHATWG: problem,
use cases, goals, non-goals, proposed markup, keyboard, accessibility mappings, alternatives, prior art
and open questions ([W3C TAG explainer guidance](https://tag.w3.org/explainers/)).

- Each explainer SHOULD end with a **Path to the platform** section: the nearest standards effort
  (an Open UI component, a WHATWG issue, a CSSWG issue), how our markup maps onto it, and what we
  would rename if it shipped.
- Where an effort already exists, our names MUST follow it, so authors migrate by renaming.
- We MAY take part in those efforts by linking our explainer and test results in their issues. Only
  the maintainer speaks for the project there.

Candidates, by the gap they fill: density scopes (`data-density`), the app shell's landmark grid,
toasts, the card's whole-card link, and the search dialog (command palette).

## 9. Token model

Three kinds of custom property, all prefixed `--dui-`:

1. **Primitives** (`css/tokens/primitives.css`): raw values named by what they are
   (`--dui-color-indigo-9`). Internal.
2. **Semantic tokens** (`css/tokens/semantic.css`): values named by what they are for
   (`--dui-color-accent`). Public; the only thing components read.
3. **Knobs**: scalars that derive whole families of semantic tokens (`--dui-radius-scale`,
   `--dui-density-scale`, `--dui-contrast`, `--dui-motion-scale`, `--dui-elevation-strength`). Public.

A theme overrides semantic tokens and knobs, scoped by `data-theme` (or `:root` for the whole page).
Derived tokens are re-declared on every scope element so overrides reach them
([CSS Variables, dependency resolution](https://www.w3.org/TR/css-variables-1/#cycles)). Every semantic
token has a description comment, every color pair is contrast-tested in light, dark and at each
contrast setting, and `npm run lint:tokens` keeps components off primitives and literals.

**Our choice:** a theme from another system can be mapped onto ours with one file of aliases
(for example a shadcn/ui theme's `--background`, `--foreground`, `--primary`, `--ring` and `--radius`
onto `--dui-color-surface`, `--dui-color-text`, `--dui-color-primary`, `--dui-color-focus` and
`--dui-radius-scale`), because it lets people bring a palette they already have without learning ours
first. Such a bridge sets semantic tokens only, like every theme.

## 10. Versioning and stability

domestic-ui follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) for the surfaces in
section 4, with commits in [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
and a changelog generated from them.

- **Breaking:** removing or renaming a public surface, changing a component's markup contract, raising
  the platform baseline so a supported browser loses the core look, or retiring a web component.
  Marked with `!` or a `BREAKING CHANGE:` footer, and approved by the maintainer before merge.
- **Before 1.0:** a breaking change bumps the minor version (0.x.0); everything else bumps the patch.
- **Deprecation:** a deprecated token, attribute value or element keeps working for at least one minor
  release, is marked **Deprecated** in its documentation with its replacement, and is removed in a
  later minor release.
- **Visual changes** to the default theme are not breaking, but they are called out in the release
  notes and covered by the screenshot tests.

**1.0 criteria.** We call it 1.0 when the semantic token list, the component attribute vocabulary and
the web component APIs have gone one full minor release with no breaking change, every component has
a docs page in MDN structure, the planned rows in section 6 have each shipped or been declined, and
the four framework demos pass the shared accessibility checks.

## 11. Frameworks and agents

- **Frameworks render; the DOM is the contract.** React, Angular, Astro and others render the same
  markup a static page would and keep their own state. They set attributes and properties on native
  elements and `dui-*` elements and listen for events. No wrapper library is planned; `demos/` shows
  each framework using the markup directly.
- **Server rendering is the default case.** Everything renders and reads correctly before any script
  runs; web components only enhance.
- **Agents read the same sources people do.** The docs build writes `llms.txt` and `llms-full.txt`
  from `PRINCIPLES.md`, the CSS header comments and `examples/`, so the contract an agent sees is the
  one the tests check.

## 12. Repository map

| Path | Holds |
| --- | --- |
| `css/domestic.css` | The entry point: layer order and imports |
| `css/reset`, `css/tokens`, `css/base`, `css/layout`, `css/components`, `css/utilities` | One folder per layer (section 2) |
| `css/themes/` | Opt-in prebuilt themes, token overrides only |
| `css/fonts/` | The optional self-hosted Inter |
| `web-components/` | The light-DOM custom elements (section 7) |
| `examples/` | Named snippets: the single source for docs examples and test fixtures |
| `explainers/` | Platform-style proposals for our own patterns (section 8) |
| `site/` | The zero-dependency docs build, which also writes `README.md` and `llms*.txt` |
| `demos/` | Vanilla, React, Angular and Astro apps, plus the shared accessibility checker |
| `tests/` | Playwright specs in Chromium, Firefox and WebKit, with axe, contrast and screenshot checks |

## 13. Roadmap

The architecture turns into three phases of issues. Order within a phase is free; each issue is a
self-contained spec.

| Phase | Goal | Issues |
| --- | --- | --- |
| 1. Foundation contract | Make the rules above checkable and the public API explicit | #95 versioning and deprecation policy, #96 Baseline status from web-features, #97 web component successors, #98 explainers' path to the platform |
| 2. Adopt emerging standards | Let the platform do more of the work, behind `@supports` | #99 customizable select, #100 `interestfor` for tooltips, #101 custom element states, #102 auto-growing text areas, #103 `@scope` evaluation |
| 3. Coverage and interop | Fill native gaps and meet tools where they are | #104 progress and meter, #105 tree view, #106 shadcn/ui theme bridge, #107 custom elements manifest |
