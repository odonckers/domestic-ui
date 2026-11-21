# Auxiliary sidebar

Status: shipped in domestic-ui as part of the [app shell](app-shell.md): the `<aside>` after `<main>` in a
`data-app-shell`.
CSS: [`css/layout/app-shell.css`](../css/layout/app-shell.css) ·
Script: [`web-components/dui-app-shell.js`](../web-components/dui-app-shell.js) ·
Example: [`examples/app-shell.html`](../examples/app-shell.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

Work screens often show the context of what is selected next to the list it came from: the order chosen in
a table, the filters for a report, the activity on a record. HTML's
[`<aside>`](https://html.spec.whatwg.org/multipage/sections.html#the-aside-element) is the element for
content related to the main content, but there is no standard for an aside that sits at the inline end of a
screen when there is room, gets out of the way when there is not, and can be dismissed. Common
implementations open a second, non-modal overlay that covers the table with no way to reach it by keyboard,
or rebuild the panel as a modal on phones with a second copy of its content.

## Use cases

- Details of the selected order beside the orders table (the
  [orders example](../examples/app-shell.html)).
- Filters for a long report, kept open while scrolling it.
- An activity feed or comments on the record in main.

## Goals

- A complementary landmark with a name, after `<main>` in source order, so it is read and tabbed after
  the content it describes.
- Beside main when the shell is wide, stacked under main or a drawer at the end when it is not.
- Collapsible with a disclosure button, like the primary sidebar, and optionally collapsed from the start.
- Updated in place when the selection changes, with the change announced politely.
- Visible and usable with JavaScript off.

## Non-goals

- A non-modal overlay floating over main.
- More than one auxiliary sidebar.
- Tabs inside it: use [tabs](../css/components/molecules/tabs.css) in the aside when it needs them.

## Proposed markup and API

- It MUST be an `<aside>` that is a child of the shell, after `<main>`, with an `id` and an accessible name
  (`aria-label` or `aria-labelledby`) that stays the same when its content changes ("Order details", not
  "Order 1042").
- Its toggle is a `<button type="button" aria-controls="id" aria-expanded="true" hidden>` in the app bar
  (see the [app shell explainer](app-shell.md)); `aria-expanded="false"` in the markup starts it collapsed.
- It sits beside main from 64rem of the shell's width (`--dui-size-sidebar-aux` wide, 20rem by default).
  Between 48rem and 64rem it is stacked under main without JavaScript and a drawer at the end with it, so
  on mid widths it starts collapsed; below 48rem it is a drawer at the end. **Our choice:** 64rem, because
  below that main would be narrower than a data table needs once both sidebars take their space.
- When a page changes its content (a row selected), it SHOULD say so in a polite
  [`role="status"`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role)
  element inside it, present from load, and it SHOULD NOT move focus. When the user explicitly asks to see a
  record (activates its link) and the aside is a drawer, the page MAY call `shell.show("end")`; focus moves
  into the drawer and returns to the link on Esc.
- Without JavaScript every record link SHOULD load a URL that renders the aside for that record (`?order=1042`).

```html
<aside id="app-aux" aria-label="Order details">
  <h2>Order 1042</h2>
  <dl>…</dl>
  <p role="status" class="visually-hidden"></p>
</aside>
```

**Our choice:** the aside's name is stable and its heading carries the record, so the landmarks list does not
change under the user, while heading navigation finds the record.

## Keyboard interaction

- Tab: reaches the aside after main (source order), when it is shown.
- Enter / Space on its toggle: collapses or expands it; when narrow, opens it as a drawer at the end.
- Esc in the drawer: closes it and returns focus to the element that opened it.

## Accessibility mappings

| Element | Role | Name / state |
| --- | --- | --- |
| `<aside aria-label="Order details">` | `complementary` ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-aside)) | "Order details" |
| Toggle | `button` | "Details"; `aria-expanded`; `aria-controls` the aside |
| Status inside | `status` (polite) | "Order 1040 shown in Order details." after a change |
| Drawer (narrow) | `dialog`, modal | the toggle's text |

A screen reader user selecting a row hears the checkbox state, then "Order 1040 shown in Order details."
without losing their place in the table.

## Alternatives considered

- **A popover at the inline end.** Non-modal and light-dismissed, so it covers the table while the table is
  still in the Tab order behind it. Rejected.
- **The details inside main, under the table** (a list-detail). Good when the details are the point of the
  screen; use [`data-list-detail`](../css/layout/list-detail.css) then. The aside is for context that the
  user may hide.
- **A second copy of the details for phones.** Rejected for the same reason as a duplicated navigation: one
  copy, moved into the drawer while it is open.
- **Announcing every update with `aria-live` on the whole aside.** Rereads the whole panel on each change.
  Rejected for one short status message.

## Prior art

- [APG Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) (complementary).
- [WCAG 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- Atlassian [Page layout](https://atlassian.design/components/page-layout) (right sidebar) and Primer
  [PageLayout](https://primer.style/components/page-layout) (pane).

## Open questions

- Should the aside remember its own collapsed state separately from the primary sidebar? The
  `dui-app-shell-toggle` event reports each edge separately, so a page can.
- Should a selection on a narrow screen open the drawer automatically? Today only an explicit link
  activation does, because opening a modal on every checkbox would be disruptive.
