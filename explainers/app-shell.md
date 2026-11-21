# App shell

Status: shipped in domestic-ui as a layout (`data-app-shell`) plus one web component (`<dui-app-shell>`).
CSS: [`css/layout/app-shell.css`](../css/layout/app-shell.css) ·
Script: [`web-components/dui-app-shell.js`](../web-components/dui-app-shell.js) ·
Examples: [`examples/app-shell.html`](../examples/app-shell.html) (a full orders screen),
[`examples/layouts/app-shell.html`](../examples/layouts/app-shell.html) (a contained shell)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

Business applications share one frame: an app bar across the top, navigation down one side, the work in
the middle, and often a second sidebar with the context of what is selected. HTML has the landmarks for
every part (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`) and the
[APG Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) practice says how to
label them, but no standard says how they become an app frame that collapses its sidebars and turns them
into drawers on a phone. Common implementations:

- render the navigation twice (a sidebar and a mobile menu), so screen reader users meet two
  navigation landmarks and the markup drifts apart;
- keep the sidebar in a `role="dialog"` at every width, so the permanent sidebar of a desktop page is
  announced as a dialog;
- switch on the viewport width, so a shell inside a docs page or a resizable panel picks the wrong mode;
- hide the sidebar with a CSS checkbox hack or `transform`, leaving it in the Tab order or with no
  `aria-expanded` on its button;
- show a "Menu" button that does nothing before (or without) JavaScript.

## Use cases

- An operations screen: orders in a table, the main navigation on the left, the selected order on the right.
- A settings area: navigation groups beside a long form.
- The same application on a phone: navigation and details open as drawers from their edges.
- A shell embedded in a page section (a documentation example, a preview pane), sized by its box.

## Goals

- Native landmarks in source order, which is also the reading and Tab order at every width
  ([2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)).
- One copy of each sidebar in the DOM, in every mode.
- Everything visible and usable with JavaScript off: no dead buttons, the current page marked.
- Wide: each sidebar collapses and expands with a disclosure button; main takes the space.
- Narrow: each sidebar opens as a modal drawer with everything a modal dialog does.
- The mode follows the shell's own width, so a contained shell works anywhere.
- Layouts and organisms inside main respond to the width main actually has.
- No horizontal scrolling at 320px ([1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html));
  motion from the tokens, off under reduced motion
  ([2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).

## Non-goals

- Resizable sidebars (see [Open questions](#open-questions)).
- A sidebar shrunk to a rail of icons. A rail needs tooltips or visible names for every icon and a second
  layout of the same links; collapsing to hidden is simpler and fully accessible.
- Persisting the collapsed state across visits (an event makes it possible; storage is the page's job).
- Routing: links in the navigation load pages; a single-page app may intercept them.

## Proposed markup and API

- The shell MUST be one element with `data-app-shell`: `<dui-app-shell data-app-shell>` to get the
  toggles' behavior, or any wrapper element for a static shell.
- A skip link to `<main>` MUST come before the shell, as its own first focusable element
  ([2.4.1 Bypass Blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)).
- Its children, in this order: a `<header>` (the app bar); the primary sidebar; `<main>`; an optional
  auxiliary `<aside>`; an optional `<footer>`. Parts are recognized by element and position, so they need
  no attributes: the `<nav>` or `<aside>` before `<main>` is the primary sidebar, the `<aside>` after it the
  auxiliary one.
- The primary sidebar SHOULD be a `<nav aria-label>` (usually with `data-nav="vertical"`). It MAY be an
  `<aside aria-label>` holding the primary `<nav>` when it also holds things that are not links (a
  workspace switcher). It MUST NOT be a `<div>`: it would not be a landmark.
- Every `<nav>` and `<aside>` MUST have an accessible name that does not repeat its role ("Main",
  "Order details"); two landmarks of the same kind MUST have different names.
- A sidebar with a toggle MUST have an `id`. Its toggle is a `<button type="button" aria-controls="id"
  aria-expanded="true" hidden>`; it MUST carry `hidden` in the markup, so it never shows without the
  script. `aria-expanded="false"` in the markup starts the sidebar collapsed when it sits beside main (an
  aux sidebar on a busy screen). At least one toggle MUST be outside the sidebar.
- `data-app-shell="contained"` makes the shell `--dui-size-pane` tall with its own scroll area; set
  `--dui-size-pane` on it to size it.
- Tokens: `--dui-size-sidebar` (16rem) and `--dui-size-sidebar-aux` (20rem) are the sidebar widths beside
  main; `--dui-size-pane` bounds a sidebar's height beside main.

```html
<a class="visually-hidden" href="#main">Skip to main content</a>
<dui-app-shell data-app-shell>
  <header>
    <button type="button" aria-controls="app-nav" aria-expanded="true" hidden>Menu</button>
    <a href="/">Northwind Operations</a>
    <button type="button" aria-controls="app-aux" aria-expanded="true" hidden>Details</button>
  </header>
  <nav id="app-nav" aria-label="Main" data-nav="vertical">…</nav>
  <main id="main">…</main>
  <aside id="app-aux" aria-label="Order details">…</aside>
</dui-app-shell>
<script type="module" src="web-components/dui-app-shell.js"></script>
```

### Modes

| Shell width | Primary sidebar | Auxiliary sidebar | Without JavaScript |
| --- | --- | --- | --- |
| under 48rem | drawer at the start | drawer at the end | both stacked, above and below main |
| 48rem to 64rem | beside main, collapsible | drawer at the end | aux stacked under main |
| 64rem and up | beside main, collapsible | beside main, collapsible | both beside main |

The breakpoints are lengths in `@container dui-app-shell` rules (a container query cannot read a custom
property), and the same two numbers are in the script.

- In a drawer the sidebar element is moved into a `<dialog data-dialog="drawer start | end" closedby="any">`
  ([drawer explainer](drawer.md)) that the element builds once, with a heading (the toggle's text) and a
  Close button, opened with [`showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).
  When it closes, the sidebar is moved back to where it was.
- `<main>` and each sidebar are named size containers (`dui-app-shell-main`, `dui-app-shell-start`,
  `dui-app-shell-end`); every layout and organism in domestic-ui switches on its own box, so they adapt to
  main's width. A page MAY write its own `@container dui-app-shell-main` rules.
- Methods `show(edge)`, `hide(edge)`, `toggle(edge)` and `isDrawer(edge)` (`"start"` or `"end"`) let a page
  open the details when a record is chosen. A `dui-app-shell-toggle` event reports every change.

**Our choice:** one copy of each sidebar, a plain landmark in its grid area, moved into a drawer only while
the drawer is open, so screen readers never hear "dialog" around a sidebar that is part of the page.

**Our choice:** the mode follows the shell's width (a `ResizeObserver` and container queries), not the
viewport, so a contained shell behaves like a full-window one.

## Keyboard interaction

- Tab / Shift+Tab: the skip link, the app bar, the primary sidebar, main, the auxiliary sidebar, the
  footer, in source order. A collapsed sidebar is `hidden`, so it is skipped.
- Enter / Space on a toggle (native button): collapses or expands its sidebar; on a narrow shell, opens it
  as a drawer and moves focus to the drawer's first focusable element (its Close button).
- Esc in a drawer: closes it; focus returns to the element that opened it (the toggle, or a link that
  called `show()`), and the toggle's `aria-expanded` becomes `false`.
- A click on the backdrop closes a drawer (`closedby="any"`, with a script fallback where it is not supported).
- Enter / Space on a group summary in the navigation: opens or closes the group (native `<details>`).

## Accessibility mappings

| Element | Role | Name / state |
| --- | --- | --- |
| `<header>` (not inside a sectioning element) | `banner` ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-header)) | |
| `<nav aria-label="Main">` | `navigation` | "Main" |
| `<main>` | `main` | |
| `<aside aria-label="Order details">` | `complementary` ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-aside)) | "Order details" |
| `<footer>` | `contentinfo` | |
| Toggle | `button` | its text; [`aria-expanded`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded) true while shown or open; [`aria-controls`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-controls) the sidebar |
| Collapsed sidebar | none ([`hidden`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden)) | removed from the accessibility tree and the Tab order |
| Drawer | `dialog`, modal | its heading (the toggle's text); the rest of the page is inert |

What a screen reader user hears, for example: on a wide screen, "Menu, button, expanded", and in the
landmarks list "banner, Main navigation, main, Order details complementary, content information". On a
phone, "Menu, button, collapsed"; after Enter, "Menu, dialog, Close, button", then the "Main" navigation
inside it; after Esc, focus is back on "Menu, button, collapsed".

## Alternatives considered

- **(a) The sidebar always lives in a `<dialog>`**, opened with `show()` (non-modal, placed in the grid)
  when wide and `showModal()` when narrow. One copy, no DOM moves. Rejected: the permanent sidebar of a
  desktop page is announced as a dialog, a non-modal `<dialog>` is not a landmark, and with JavaScript off
  a closed dialog hides the navigation (an `open` attribute in the markup works around that but is
  discouraged by HTML).
- **(b) The sidebar is a plain landmark, moved into a drawer `<dialog>` while narrow.** Chosen, with one
  refinement: it is moved only while the drawer is open, not for the whole narrow mode, so between opens it
  sits hidden in its own place and a mode change never moves it.
- **(c) A [`popover`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover) instead
  of a dialog for the narrow mode.** A popover can be the sidebar itself (no move) and light-dismisses, but
  it is not modal: the page behind stays in the Tab order and the accessibility tree, which a full-height
  navigation drawer covering the page should not allow. Rejected for the drawer; it remains a candidate for
  a non-modal side panel (see the drawer explainer).
- **[`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details) for
  collapse.** Works without script, but the summary must sit inside the sidebar, so the toggle cannot live
  in the app bar; the content cannot be a drawer; and a closed `<details>` cannot be shown again at a wider
  width without script. Rejected.
- **CSS-only checkbox hacks** (`:checked ~ nav`). The checkbox is announced as a checkbox, not a button with
  an expanded state, it stays in the Tab order with nothing to toggle when CSS lays everything out, and the
  drawer has no modality or Esc. Rejected.
- **Duplicated navigation** (a sidebar and a separate mobile menu). Two navigation landmarks with the same
  links, two places to mark the current page, and twice the markup for server rendering. Rejected.
- **Viewport media queries for the mode.** Break a shell inside a page section or a resizable pane.
  Rejected in favor of container queries and a `ResizeObserver` on the shell.

## Prior art

- [APG Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) and the
  [APG Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) (the toggles).
- [APG Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and the WHATWG
  [`<main>`](https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element) and
  [`<aside>`](https://html.spec.whatwg.org/multipage/sections.html#the-aside-element) elements.
- MDN [`grid-template-areas`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-areas),
  [container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) and
  [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver).
- Design systems: Apple HIG [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars),
  Carbon [UI shell header](https://carbondesignsystem.com/components/UI-shell-header/usage/),
  Primer [PageLayout](https://primer.style/components/page-layout),
  Atlassian [Page layout](https://atlassian.design/components/page-layout),
  GOV.UK [Service navigation](https://design-system.service.gov.uk/components/service-navigation/).
- [Open UI](https://open-ui.org/) has no app shell or sidebar proposal; this explainer is written so the
  parts could map onto native landmarks unchanged.

## Open questions

- **Resizable sidebars.** A draggable edge would follow the
  [APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) pattern (a focusable
  `role="separator"` with `aria-valuenow` and arrow keys), as noted for the [split view](split-view.md). Not
  built until a real use needs it.
- **Persisting the collapsed state.** The `dui-app-shell-toggle` event carries `expanded`; a page MAY store
  it (a cookie the server reads, so the markup can start with `aria-expanded="false"`, avoids a flash;
  [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) works too).
  Should the element do this itself?
- **A flash on narrow screens.** With JavaScript on, the stacked sidebars show until the module runs. A
  server that knows the client is narrow can render the sidebars `hidden` and the toggles visible; should
  the element offer a hook for that?
- **Rails.** Is there a version of an icon rail that keeps names visible and needs no duplicate links?
