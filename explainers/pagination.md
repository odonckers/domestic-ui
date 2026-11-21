# Pagination

Status: shipped in domestic-ui as a styling contract.
CSS: [`css/components/molecules/pagination.css`](../css/components/molecules/pagination.css) ·
Example: [`examples/molecules/pagination.html`](../examples/molecules/pagination.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

Long lists and search results are split into pages. HTML has `rel="prev"` and `rel="next"`,
and ARIA has `aria-current="page"`, but there is no pagination element and no APG pattern
that says how to combine them. Common implementations announce bare numbers ("link, 5"),
use buttons for navigation, or leave a disabled "Previous" link that still receives focus
and goes nowhere.

## Use cases

- Search results with ten pages.
- An archive with hundreds of pages, where only nearby page numbers are shown.
- A table of records loaded one page at a time from the server.

## Goals

- Works with plain links and server rendering. No JavaScript.
- Every link has a complete accessible name ("Page 5", "Next page").
- The current page is announced as current, and looks different by more than color.
- Disabled ends are not focusable and not announced as links.
- Targets are at least 44 by 44 CSS pixels.

## Non-goals

- Deciding which page numbers to show (that is server logic).
- "Load more" buttons and infinite scroll.
- Client-side paging of a table already in the page.

## Proposed markup and API

- The container MUST be a `<nav>` with `data-pagination` and an `aria-label`. The label
  SHOULD be "Pagination", and MUST differ when a page has more than one pagination.
- Pages MUST be a list (`<ul>` or `<ol>`) of `<li>` items, each with one `<a href>`.
- Number links MUST have an accessible name that includes "Page", for example with a
  visually hidden "Page " before the number.
- The current page link MUST have `aria-current="page"`. **Our choice:** it stays a link, so it
  is announced in place and the list count does not change between pages.
- Previous and Next links SHOULD have `rel="prev"` and `rel="next"`, and MUST say "page" in their
  accessible name.
- At the first or last page, Previous or Next MUST be an `<a>` without `href` (a
  [placeholder link](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)).
  It is not focusable and has no link role. **Our choice:** keep it visible, so the row does not
  shift between pages.
- A gap in the numbers MAY be `<li aria-hidden="true">…</li>`.

```html
<nav aria-label="Pagination" data-pagination>
  <ul>
    <li><a href="?page=4" rel="prev">Previous<span class="visually-hidden"> page</span></a></li>
    <li><a href="?page=1"><span class="visually-hidden">Page </span>1</a></li>
    <li aria-hidden="true">…</li>
    <li><a href="?page=5" aria-current="page"><span class="visually-hidden">Page </span>5</a></li>
    <li><a href="?page=6"><span class="visually-hidden">Page </span>6</a></li>
    <li><a href="?page=6" rel="next">Next<span class="visually-hidden"> page</span></a></li>
  </ul>
</nav>
```

Visuals: links are outlined boxes; the current page is filled with the accent color and bold,
with an inner focus ring in its text color; a disabled end has muted text (still 4.5:1) and a
dashed border.

## Keyboard interaction

- Tab: moves to the next page link / Shift+Tab: previous. Disabled ends are skipped.
- Enter: follows the focused link.

No arrow-key behavior: this is a list of links, not a composite widget.

## Accessibility mappings

| Element | Role | Name / state |
| --- | --- | --- |
| `<nav aria-label>` | `navigation` | "Pagination" |
| `<ul>` | `list` | item count |
| `<a href>` | `link` | "Page 4", "Previous page" |
| Current `<a>` | `link`, `aria-current="page"` | "Page 5, current page" |
| `<a>` without `href` | none (generic) | text only, not focusable |
| Gap `<li aria-hidden="true">` | hidden | not announced |

A screen reader user hears, for example, "Pagination, navigation, list, 6 items, link, Page 5,
current page".

## Alternatives considered

- **Buttons instead of links.** Rejected: pages are URLs. Links can be opened in a new tab,
  bookmarked and crawled, and need no script.
- **The current page as plain text.** A valid choice (some systems do it). Rejected as the
  default because the item is then announced without "link", and users who navigate by links
  skip it.
- **`aria-disabled="true"` on a real link for disabled ends.** Rejected: the link still has a
  role and focus, and goes nowhere, so it needs script to block activation. A placeholder link
  says less and does less, which is right.
- **Hiding disabled ends.** Rejected: the controls jump position between pages.

## Prior art

- [GOV.UK Design System: Pagination](https://design-system.service.gov.uk/components/pagination/).
- [WHATWG link types `next` and `prev`](https://html.spec.whatwg.org/multipage/links.html#link-type-next).
- [MDN `aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current).
- [WCAG 2.2 Understanding 2.4.4 Link Purpose (In Context)](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)
  and [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Mapping to a future standard

The contract is "a navigation landmark of page links with one current page". The names already
used (`nav`, `aria-current`, `rel`) are the standard ones; a future native element would need
none of the `data-pagination` styling hooks.

## Open questions

- Should "load more" and infinite scroll get their own explainer, including focus management
  and a live region for new items?
- For very long ranges, should there be a "go to page" form instead of more numbers?
- Search engines no longer use `rel="prev"`/`rel="next"` for indexing; is it still worth
  recommending for other user agents?
