# Density

Status: shipped in domestic-ui as semantic tokens and one attribute.
CSS: the density tokens in [`css/tokens/semantic.css`](../css/tokens/semantic.css) (sections 2 and 4) ·
Example: [`examples/patterns/density.html`](../examples/patterns/density.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

Data-heavy screens (tables, admin forms, toolbars) need to show more on one screen than a
marketing page or a settings form does. There is no web standard for density: no media query, no
user preference, no HTML attribute. Design systems invent their own, often a second set of
components or a scaled-down copy of the whole UI, and many make compact controls smaller than
people can reliably hit, or shrink the text with them.

## Use cases

- An order table with a filter form and a toolbar above it, where comfortable spacing shows ten
  rows and compact shows fifteen.
- An app shell whose main area is compact while a settings dialog inside it stays comfortable.
- A theme that makes controls a little taller everywhere, with compact following it.

## Goals

- One attribute on any element; everything inside follows, including nested components.
- Density changes space only: control heights, padding, gaps and table cells. Text size never
  changes ([WCAG 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) is about
  the user's text size, which density must not fight).
- Compact keeps every target at least 24 by 24 CSS pixels
  ([WCAG 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- Comfortable is the default; no attribute means comfortable.
- Plain CSS custom properties; themes can retune it.

## Non-goals

- A user-facing density preference. A page MAY offer one and set the attribute itself.
- Changing type sizes, icon sizes or layout (columns, breakpoints).
- More than two named levels.

## Proposed markup and API

- `data-density="compact"` on any element MUST tighten every component inside it.
  `data-density="comfortable"` MUST restore the default values inside a compact area.
- **Our choice:** an attribute on any ancestor, not a media query, because density follows the
  task (a data table, a toolbar), not the device or the viewport, and parts of one page often need
  different densities.
- The attribute sets one knob, `--dui-density-scale`: `1` comfortable, `0` compact. Components never
  read the knob. They read density-aware semantic tokens derived from it:

  | Token | Comfortable | Compact | Used by |
  | --- | --- | --- | --- |
  | `--dui-size-control` | 44px (`--dui-size-target`) | 32px (`--dui-size-target-small`) | min block size of inputs, selects, buttons, check labels, summaries, tabs, nav, menu, pagination and listbox items |
  | `--dui-space-control-block` | 0.5rem | 0.25rem | block padding of the same |
  | `--dui-space-control-inline` | 0.75rem | 0.5rem | inline padding of text fields and items |
  | `--dui-space-button-inline` | 1rem | 0.75rem | inline padding of buttons and tabs |
  | `--dui-space-gap` | 0.5rem | 0.25rem | gap between the parts of a control |
  | `--dui-space-gap-tight` | 0.25rem | 0.125rem | gap and padding in groups: field, toolbar, pagination, menu |
  | `--dui-space-cell` | 0.5rem | 0.25rem | table cell padding |

- These tokens MUST be re-declared on every `[data-density]` element, as dependent tokens are on
  `[data-theme]` and `[data-motion]`: a custom property's `var()` references are resolved where it is
  declared ([CSS Variables, substitution](https://www.w3.org/TR/css-variables-1/#cycles)), so a
  token computed once on `:root` would not follow a knob changed lower down.
- Each token interpolates between its comfortable and compact value:
  `compact + (comfortable − compact) × --dui-density-scale`. A theme MAY set the knob between `0`
  and `1`; it MUST NOT go below `0`, which could take targets under 24px.
- Comfortable values come from other semantic tokens (`--dui-size-target`, the space scale), so a
  theme that changes them moves comfortable density with it.
- `small` and `large` buttons keep their sizes at every density.

```html
<main data-density="compact">
  <table>…</table>
  <dialog data-density="comfortable">…</dialog>
</main>
```

## Keyboard interaction

None. Density changes no behavior.

## Accessibility mappings

None: density is presentation only. It does not change roles, names or states, and it does not
change text size. Every interactive target stays at least 24 by 24 CSS pixels in compact (32px tall
controls; checkboxes, radios and switches are targeted through their 32px tall `<label>`).
`tests/density.spec.js` measures every control in the compact demo.

## Alternatives considered

- **A media query** (for example a viewport width or `pointer: coarse`). Rejected: density is a
  property of the content, not of the device, and a media query cannot give one part of a page a
  different density.
- **[`zoom`](https://developer.mozilla.org/en-US/docs/Web/CSS/zoom) or scaling the root font size.**
  Rejected: both shrink text along with space, against the user's chosen text size, and scale
  targets proportionally, so a 44px control at `zoom: 0.5` would be 22px, under the WCAG 2.5.8
  minimum.
- **A second set of compact components** (`data-button="compact"` and the like on every component).
  Rejected: one attribute on an ancestor covers every component, including ones added later.
- **Separate compact tokens that authors swap by hand.** Rejected: nesting (comfortable inside
  compact) would need every token overridden twice.

## Prior art

- [Cloudscape Design System: Content density](https://cloudscape.design/foundation/visual-foundation/content-density/),
  which offers a comfortable and a compact mode.
- [WCAG 2.2 Understanding 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
  (inheritance and scoping).

## Mapping to a future standard

If a density user preference ever arrives as a media feature, a page would set
`data-density="compact"` on `:root` inside that media query; nothing else changes.

## Open questions

- Should compact also tighten the flow rhythm between blocks (`--dui-space-m`), or only space
  inside components, as now?
- Should there be a third, "spacious" level for touch-first screens?
- Should `small` buttons get smaller in compact, down to the 24px minimum?
