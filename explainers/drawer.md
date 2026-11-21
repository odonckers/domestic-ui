# Drawer

Status: shipped in domestic-ui as a `<dialog>` variant.
CSS: [`css/components/molecules/dialog.css`](../css/components/molecules/dialog.css) ·
Example: [`examples/molecules/dialog.html`](../examples/molecules/dialog.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

A drawer (side sheet, off-canvas panel) slides in from an edge of the viewport to hold
filters, navigation or details. HTML has no drawer element and the APG has no drawer pattern.
Many implementations are a positioned `<div>` that does not trap focus, does not close on
Esc, leaves the page behind it reachable, and is hard-coded to the left or right edge.

## Use cases

- Filters for a list, next to the results.
- Site navigation on small screens.
- Details of a selected row, without leaving the table.

## Goals

- Everything a modal dialog does: focus moves in, the rest of the page is inert, Esc closes,
  focus returns to the opener.
- Start and end edges that follow the writing direction.
- Full block size of the viewport; the content scrolls with the header kept in view.
- An open and close transition that is off under reduced motion and harmless where unsupported.
- No JavaScript.

## Non-goals

- Swipe gestures.
- Drawers that push the page content aside.
- Top and bottom sheets.

## Proposed markup and API

- A drawer MUST be a `<dialog>` with `data-dialog="drawer"`, plus `start` or `end`
  (`end` is the default): `data-dialog="drawer start"`.
- It MUST have an accessible name, normally `aria-labelledby` pointing at its heading.
- It SHOULD be opened with `showModal()` or `command="show-modal" commandfor="id"`, so it is modal.
- It MUST contain a visible way to close it: a `command="close"` button or a
  `<form method="dialog">` submit button.
- It MAY have `closedby="any"` so a click on the backdrop closes it. Where `closedby` is not
  supported, Esc and the close button still work.
- An optional `<header>` (heading and close button) stays at the top while the body scrolls;
  an optional `<footer>` holds actions.

```html
<button type="button" commandfor="filters" command="show-modal">Filters</button>
<dialog id="filters" data-dialog="drawer end" closedby="any" aria-labelledby="filters-title">
  <header>
    <h2 id="filters-title">Filters</h2>
    <button type="button" commandfor="filters" command="close">Close</button>
  </header>
  <form method="dialog">
    …
    <footer><button type="submit">Apply</button></footer>
  </form>
</dialog>
```

**Our choice:** a drawer is a dialog variant, not a new element, because every behavior users
rely on (inertness, focus, Esc, the top layer) already comes with `<dialog>`.

## Keyboard interaction

- Enter / Space on the opener: opens the drawer and moves focus to its first focusable element
  (or the element with `autofocus`).
- Tab / Shift+Tab: move between focusable elements inside the drawer.
- Esc: closes the drawer and returns focus to the opener.

## Accessibility mappings

| Element | Role | Name / state |
| --- | --- | --- |
| `<dialog>` opened with `showModal()` | `dialog`, modal | its heading, via `aria-labelledby` |
| Content outside | inert | not reachable |
| Close button | `button` | "Close" |

A screen reader user hears, for example, "Filters, dialog" and then the focused control. The
drawer's position is visual only; nothing about "start" or "end" is announced.

## Alternatives considered

- **A new `<dui-drawer>` element.** Rejected: it would re-implement focus trapping, inertness
  and Esc, all of which `<dialog>` already does correctly.
- **A `popover` element positioned at an edge.** Rejected as the default: a popover is not
  modal, so the page behind stays interactive and is not inert. It MAY be a reasonable
  non-modal drawer; see the open questions.
- **`left`/`right` keywords.** Rejected: they break in right-to-left languages. `start` and
  `end` follow [logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values).

## Prior art

- [WHATWG `dialog` element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
  and [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog),
  including `closedby`.
- [APG Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- [MDN Invoker Commands API](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API).
- [MDN `@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) and
  [`transition-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior).
- [WCAG 2.2 Understanding 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

## Mapping to a future standard

The variant only changes position and motion. It could become a presentational hint on
`<dialog>` itself, or be expressed entirely in CSS with no attribute at all if a standard
"edge" placement for top-layer elements appears.

## Open questions

- Swipe to close on touch screens needs script; should a small component offer it?
- Non-modal drawers (a side panel that leaves the page usable): `dialog.show()` or a popover?
- Should a `start` drawer used for navigation be closed automatically when the viewport
  becomes wide enough to show the navigation inline?
