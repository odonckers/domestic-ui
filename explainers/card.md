# Card

Status: shipped in domestic-ui as a styling contract.
CSS: [`css/components/molecules/card.css`](../css/components/molecules/card.css) ·
Example: [`examples/molecules/card.html`](../examples/molecules/card.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

Cards are everywhere: lists of articles, products, projects. HTML has no card element and the
APG has no card pattern. Authors often make the whole card clickable by wrapping it in one big
`<a>` or by adding a click handler to a `<div>`. The first gives the link a very long accessible
name made of every word in the card. The second is invisible to keyboard and assistive
technology users. Secondary actions inside the card then become nested interactive content,
which HTML does not allow.

## Use cases

- A grid of articles where each card links to the article.
- A pricing grid where each card has a heading, details and one button.
- A project card that opens the project, with an "Edit" action next to it.

## Goals

- A card is ordinary sectioning content with a heading, so users can navigate by heading.
- A whole-card link keeps the heading as its accessible name.
- Secondary actions stay reachable with the pointer and the keyboard.
- Keyboard focus on the card link is clearly visible on the whole card.
- No JavaScript.

## Non-goals

- Layout of the card grid (use `.grid` from the layout layer).
- Selectable cards (checkbox cards) and draggable cards.
- Image loading, aspect ratios beyond `object-fit: cover`.

## Proposed markup and API

- A card MUST be an `<article>` when it makes sense on its own, else a `<section>` or `<li>`.
- A card MUST contain a heading (`h2`–`h6`).
- `data-card` on the element makes it a card. `data-card="link"` makes the whole card follow
  the first link inside its heading.
- Optional media is the first child: `<img>`, `<picture>` or `<video>`. Media SHOULD have
  `alt=""` when it only decorates.
- Actions go in a `<footer>` child. In a link card, every interactive element other than the
  heading link MUST be inside that `<footer>`.

```html
<article data-card="link">
  <img src="cover.jpg" alt="" width="640" height="360">
  <h3><a href="/guides/theming/">Theming guide</a></h3>
  <p>Override semantic tokens to make a theme.</p>
  <footer>
    <a href="/guides/theming/edit">Edit</a>
  </footer>
</article>
```

How it works: the heading link gets an `::after` pseudo-element with `position: absolute;
inset: 0`, so its hit area covers the card (the card is `position: relative`). The footer is
positioned above it with `z-index: 1`. The link's focus outline moves to the pseudo-element.

**Our choice:** the link lives in the heading, because the heading is the shortest text that
names the destination (WCAG 2.4.4).

## Keyboard interaction

- Tab: moves to the heading link, then to each footer action, in DOM order.
- Enter: follows the focused link.

A link card is one Tab stop plus its footer actions; body text is not focusable.

## Accessibility mappings

| Element | Role | Name |
| --- | --- | --- |
| `<article data-card>` | `article` | none (not needed) |
| Heading | `heading` with its level | its text |
| Heading `<a href>` | `link` | the heading text only |
| Footer actions | `link` or `button` | their own text |

A screen reader user hears, for example, "heading level 3, link, Theming guide". Moving by
heading or by link reaches each card once. The media is skipped when `alt=""`.

## Alternatives considered

- **Wrap the whole card in `<a>`.** Rejected: the accessible name becomes every word in the
  card, and any button or link inside is nested interactive content, which the
  [HTML content model for `a`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)
  forbids.
- **A click handler on the card.** Rejected as the default: it needs JavaScript, and users of
  middle-click, "open in new tab" and link previews lose them. It does allow text selection;
  see the open questions.
- **`role="link"` on the card element.** Rejected: ARIA cannot give a `<div>` real link
  behavior, and it breaks the first rule of ARIA use
  ([Using ARIA](https://www.w3.org/TR/using-aria/#rule1)).

## Prior art

- Heydon Pickering, [Inclusive Components: Cards](https://inclusive-components.design/cards/),
  which describes both the pseudo-element overlay and the "redundant click event".
- [WHATWG `article` element](https://html.spec.whatwg.org/multipage/sections.html#the-article-element).
- [WCAG 2.2 Understanding 2.4.4 Link Purpose (In Context)](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)
  and [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).
- [W3C images tutorial: decorative images](https://www.w3.org/WAI/tutorials/images/decorative/).

## Mapping to a future standard

`data-card="link"` describes "this region activates its primary link". If HTML gains a way to
declare a block-level click target that delegates to a link (an idea discussed in Open UI and
elsewhere), the attribute would map onto it and the pseudo-element would go away.

## Open questions

- Text in a link card cannot be selected with the mouse, because the overlay sits on top.
  Should a variant use the redundant click event (script) instead to allow selection?
- Should the card expose a hover style for touch users, who have no hover?
- Should cards in a list be `<li>` with `data-card`, so the list count is announced?
