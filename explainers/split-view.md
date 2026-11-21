# Split view

Status: shipped in domestic-ui as two layouts, `data-split` and `data-list-detail`; no resizable divider.
CSS: [`css/layout/split.css`](../css/layout/split.css), [`css/layout/list-detail.css`](../css/layout/list-detail.css) ·
Examples: [`examples/layouts/split.html`](../examples/layouts/split.html),
[`examples/layouts/list-detail.html`](../examples/layouts/list-detail.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

Business applications show two related things at once: an invoice beside its payments, a list of orders
beside the open order, a form beside its preview. HTML has no element for "two regions side by side", and
the APG has a pattern only for the draggable divider between them
([Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)), not for the layout itself.
Common implementations:

- switch to a stacked layout with a viewport media query, so the split breaks when it sits in a narrower
  region (a dialog, a sidebar layout, the main area of an app shell);
- reorder the regions visually with `order` or grid placement, so the reading and Tab order no longer
  match what is on screen;
- make the second region a fixed-height scroller at every width, so phones get a scroll area inside a
  scroll area;
- add a draggable divider that only works with a mouse.

## Use cases

- An invoice with its line items beside the payment history (`2:1`).
- Shipping and billing addresses next to each other (`1:1`).
- A short customer summary beside a long activity feed (`1:2`).
- A list of orders beside the selected order, where each list item is a link to the order's URL
  (list-detail).
- A settings page: links to its sections beside the forms that edit them (list-detail of in-page links).

## Goals

- Two regions side by side when their wrapper is wide enough, stacked when it is not, from 320px up,
  whatever the viewport size ([WCAG 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)).
- A short list of ratios that keeps splits consistent across an application.
- Source order is the reading and Tab order in both arrangements
  ([1.3.2 Meaningful Sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html),
  [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)).
- Each region is a landmark screen reader users can jump to.
- For list-detail: real links, so URLs, history and the no-JavaScript case work; the detail scrolls on its
  own when side by side, so a long list does not push it out of view.
- No JavaScript.

## Non-goals

- A resizable or collapsible divider (see [Open questions](#open-questions)).
- More than two regions; nest a split inside a region instead.
- Remembering a user's preferred ratio.
- Swapping the order of the regions at some widths.

## Proposed markup and API

### Split

`data-split` on a wrapper of exactly two regions:

```html
<div data-split="2:1">
  <section aria-labelledby="invoice-title">
    <h2 id="invoice-title">Invoice INV-2025-0318</h2>
    …
  </section>
  <aside aria-labelledby="payments-title">
    <h2 id="payments-title">Payments</h2>
    …
  </aside>
</div>
```

- The value MUST be empty, `1:1`, `1:2` or `2:1`: the share of the inline size each region takes, in source
  order. Empty means `1:1`.
- The wrapper MUST have exactly two element children. Each SHOULD be a `<section>` named by its heading
  with `aria-labelledby`, or an `<aside>` when it is complementary to the other.
- The regions MUST be side by side when the wrapper is at least 40rem wide, and stacked, first region on
  top, when it is narrower. Implementations SHOULD decide this with a container query on the wrapper,
  not a viewport media query.
- Authors MUST NOT reorder the regions with CSS.

### List-detail

`data-list-detail` on a wrapper of a list and a detail:

```html
<div data-list-detail>
  <nav aria-label="Orders">
    <ul>
      <li><a href="?order=1042" aria-current="page">Order 1042 <small>Ada Lovelace</small></a></li>
      <li><a href="?order=1041">Order 1041 <small>Alan Turing</small></a></li>
    </ul>
  </nav>
  <section aria-labelledby="order-title" tabindex="0">
    <h2 id="order-title">Order 1042</h2>
    …
  </section>
</div>
```

- The first child MUST hold a `<ul>` or `<ol>` whose items are each one `<a href>`; it SHOULD be a
  `<nav>` with an `aria-label`. Items MAY be `<button>`s only when the detail has no URL of its own.
- The selected item MUST have `aria-current="page"` (on a link) or `aria-current="true"` (on a button), and
  MUST be shown with more than color: implementations draw an accent bar, a tint and bold text.
- The second child MUST be a `<section>` or `<article>` named by its heading.
- When side by side (wrapper at least 40rem), the detail sticks to the top of its scroll area and is at most
  `--dui-size-pane` (the small viewport height) tall, scrolling on its own. It SHOULD then have
  `tabindex="0"` so keyboard users can scroll it. When stacked it is part of the page and does not scroll
  by itself.
- Selecting an item SHOULD load the item's URL. A page that swaps the detail with script MUST update
  `aria-current` and the URL, and MUST NOT move focus without a page load.

## Keyboard interaction

No new keys. Tab follows source order:

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | Split: through the first region, then the second. List-detail: through the list links, then into the detail pane and its contents |
| <kbd>Enter</kbd> | On a list link: opens that item's detail |
| Arrow keys, <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | Scroll the detail pane once it has focus |

## Accessibility mappings

| Markup | Role | Name | State |
| --- | --- | --- | --- |
| `<section aria-labelledby>` | `region` ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-section)) | its heading | none |
| `<aside aria-labelledby>` | `complementary` ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-aside)) | its heading | none |
| `<nav aria-label>` | `navigation` | the label ("Orders") | none |
| `<a aria-current="page">` | `link` | its text | current page ([MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current)) |
| wrapper (`<div>`) | none (generic) | none | none |

A screen reader user hears the landmarks in source order whatever the arrangement, and "current page" on the
selected item.

## Alternatives considered

- **A draggable divider ([APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)).**
  A focusable `role="separator"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and
  `aria-controls`, moved with the arrow keys, <kbd>Home</kbd>, <kbd>End</kbd> and (optionally)
  <kbd>Enter</kbd> to collapse. It needs script for both the keys and the pointer, a minimum size for each
  pane, and storage for the chosen position. Rejected for now: the use cases above are served by fixed
  ratios, and a half-built splitter is worse than none. It is the documented path if one is added.
- **CSS [`resize`](https://developer.mozilla.org/en-US/docs/Web/CSS/resize) on the first region.** Gives
  a resize handle with no script, but only to pointer users: the handle cannot be focused or operated from
  the keyboard and has no accessible name or value, so it fails
  [2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) as the only way to resize.
  It also needs `overflow` other than `visible`, clipping focus rings. Rejected.
- **Flexbox with a wrapping threshold** ([Every Layout's Switcher](https://every-layout.dev/layouts/switcher/)
  and [Sidebar](https://every-layout.dev/layouts/sidebar/), built on
  [flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout)). Switches
  without any query, and the threshold can be a custom property. Rejected because the switch cannot change
  anything else (the list-detail pane must stop scrolling on its own when stacked), and exact ratios with a
  gap are harder to keep than with grid tracks. Container queries were not interoperable when those
  techniques were written; they are now.
- **A viewport media query.** Simple, but wrong for a split inside a narrower region, which is the common
  case inside an app shell. Rejected in favor of
  [container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries).
- **A free ratio as a custom property** (`--split-ratio: 0.4`). Rejected: three ratios cover the use cases,
  and a closed list keeps an application's screens consistent.

## Prior art

- [APG Window Splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/): the keyboard
  and ARIA contract for a movable divider.
- [MDN `separator` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/separator_role):
  a focusable separator is a widget with a value.
- [Every Layout: The Sidebar](https://every-layout.dev/layouts/sidebar/) and
  [The Switcher](https://every-layout.dev/layouts/switcher/): intrinsic two-region layouts without queries.
- [Primer SplitPageLayout](https://primer.style/product/components/split-page-layout/): a pane beside
  content, stacked on narrow screens, with an optional resizable pane.
- [Apple Human Interface Guidelines: Split views](https://developer.apple.com/design/human-interface-guidelines/split-views):
  list and detail columns that collapse to one on compact widths.

## Open questions

- **A resizable divider.** If added, it MUST follow the APG Window Splitter pattern (a focusable
  `role="separator"` with a value, arrow keys, and a pointer handle at least 24 by 24 CSS pixels), and would
  be a small web component around the existing `data-split` markup, with the fixed ratio as the no-script
  fallback. Where to store the position (URL, `localStorage`, server) is open.
- **Breakpoints as tokens.** Container query conditions cannot read custom properties, so the 40rem
  switch is a length in the CSS. A future
  [CSS Conditional Rules Level 5](https://drafts.csswg.org/css-conditional-5/) feature or custom media
  queries could let a theme move it.
- **Collapsing the list.** On a medium width a list-detail could hide its list behind a button (a drawer)
  instead of stacking. That is the app shell's job (a later session) and may reuse the
  [drawer](drawer.md).
- **Focus after a selection without a page load.** Whether moving focus to the detail heading or keeping it
  on the list link is better for screen reader users needs testing with users; the current rule (leave it)
  is the conservative one.
