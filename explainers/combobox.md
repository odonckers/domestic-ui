# Combobox (typeahead)

Status: shipped in domestic-ui as a web component over native markup.
CSS: [`css/components/molecules/combobox.css`](../css/components/molecules/combobox.css) ·
Script: [`web-components/dui-combobox.js`](../web-components/dui-combobox.js) ·
Example: [`examples/molecules/combobox.html`](../examples/molecules/combobox.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

Unlike the other explainers here, this pattern **has** an APG pattern: the
[APG Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), in its
[list autocomplete variant](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/).
This file records how domestic-ui maps it onto native HTML and the choices the APG leaves open.

## Problem

HTML can suggest values for a text field: an `<input list>` with a
[`<datalist>`](https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element).
But the suggestion popup is drawn by the browser. It cannot be styled or themed, it looks and
filters differently in each engine and on mobile, it cannot show how many suggestions match, and
its support in assistive technology varies. Authors who need a consistent typeahead build one
from scratch, and many of those get the ARIA combobox contract wrong: focus moved into the list,
no `aria-expanded`, or results that change silently.

## Use cases

- Picking a city, a carrier or a product from a known list, while still allowing free text.
- Searching a long list held by a server: the page loads matching options as the user types.
- Filling a form field from suggestions, then submitting the form as usual.

## Goals

- The same markup works with JavaScript off, as a native `<input list>`.
- After the upgrade it follows the APG list autocomplete combobox exactly: focus stays in the
  input, the active option is conveyed with `aria-activedescendant`.
- The value is the input's value: forms, labels, `name` and validation do not change.
- Screen reader users hear how many options match after typing.
- Works at 320px wide, with targets at least 24 by 24 CSS pixels at every density.
- No fetch code inside the component; the page decides where options come from.

## Non-goals

- Select-only comboboxes, where the value must be one of the options: use `<select>`.
- Inline autocomplete (the rest of the top match typed into the input, `aria-autocomplete="both"`).
- Multiple values, grouped options, or rich option content.
- Fuzzy matching and ranking.

## Proposed markup and API

- The component MUST wrap a `<label>`, an `<input list="id">` and the `<datalist id="id">` it
  points to. **Our choice:** `<input list>` + `<datalist>` as the native fallback, not `<select>`,
  because the value is free text and the upgrade reuses the same input and the same options.
- The input MUST have an accessible name from its `<label>`. It SHOULD be the last visible child
  of `<dui-combobox>`: put hints and errors after the component and point at them with
  `aria-describedby`.
- Each `<option value>` in the datalist is a suggestion. An option MAY have a `label` that is
  shown as a hint after the value; filtering matches both.
- On upgrade the component MUST keep the same `<input>` element, MUST remove its `list`
  attribute (so the native popup never shows beside the listbox) and MUST add `role="combobox"`,
  `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` and `autocomplete="off"`.
- It MUST build a `<ul role="listbox">` after the input, labelled by the same `<label>`, with one
  `<li role="option">` per option, and a visually hidden `role="status"` region that exists from the
  upgrade on, before it is first updated.
- Filtering is built in. **Our choice:** case-insensitive "contains", not "starts with", because
  users often remember a word from the middle ("York" for "New York"), and the native datalist
  popups in Chromium and Firefox match the same way.
- On every `input` the component MUST dispatch `dui-combobox-filter` on itself (bubbles, cancelable,
  `detail: { query }`). A page that loads options itself MUST cancel it, then replace the options
  with `element.setOptions(values)` (strings or `{ value, label }` objects) or by changing the
  datalist's children; the component watches the datalist and re-reads it. While the event is
  canceled the component shows the options as given, unfiltered.
- When an option is accepted the component MUST set the input's value and dispatch `change` on the
  input, so forms and frameworks see the new value.
- The status region SHOULD say "N results", "1 result" or "No results" once typing pauses
  (400ms), not on every keystroke.
- **Our choice:** the listbox is absolutely positioned under the input inside `<dui-combobox>`,
  not a popover in the top layer. It is exactly as wide as the field, so it never overflows the
  viewport sideways, and it needs neither anchor positioning nor the popover fallback that
  centers a panel at the bottom of the viewport. The cost: an ancestor that clips its overflow also
  clips the list.

```html
<dui-combobox>
  <label for="city">City</label>
  <input type="text" id="city" name="city" list="city-options">
  <datalist id="city-options">
    <option value="Amsterdam"></option>
    <option value="Berlin"></option>
    <option value="Copenhagen"></option>
  </datalist>
</dui-combobox>
<script type="module" src="web-components/dui-combobox.js"></script>
```

Options from a server:

```js
combobox.addEventListener("dui-combobox-filter", async (event) => {
  event.preventDefault();
  const response = await fetch(`/cities?q=${encodeURIComponent(event.detail.query)}`);
  combobox.setOptions(await response.json());
});
```

Visuals: the list sits at the popover elevation and fades and grows in like a popover (the zoom is
dropped under reduced motion; every duration is `0s` with `data-motion="none"`). The active option
has an outline in the focus color and a tint, so it is not shown by color alone. Option heights
follow [density](density.md).

## Keyboard interaction

Focus stays in the input throughout.

- Down Arrow: opens the list and moves to the next option (the first if none); wraps from last to first.
- Up Arrow: opens the list and moves to the previous option (the last if none); wraps from first to last.
- Alt+Down Arrow: opens the list without moving to an option. Alt+Up Arrow closes it.
- Enter: accepts the active option and closes the list. With no active option it does nothing
  special, so it submits the form.
- Escape: closes the list; if it is already closed, clears the input (as in the APG example).
  An empty, closed combobox lets Escape through, so a surrounding dialog still closes.
- Home / End: move the caret to the start or end of the input, and the list loses its active
  option. **Our choice:** follow the APG for editable comboboxes, where Home and End belong to the
  text field ("returns focus to the combobox and places the cursor"), rather than jumping to the
  first or last option, because the input is free text and the caret keys must keep working.
  Left and Right Arrow do the same.
- Typing: filters the options and opens the list when any match.
- Tab: accepts nothing, closes the list and moves on.
- Pointer: clicking an option accepts it; focus stays in the input.

## Accessibility mappings

| Element | Role | Name / state |
| --- | --- | --- |
| `<input>` | `combobox` | From its `<label>`; `aria-expanded`, `aria-autocomplete="list"`, `aria-controls`, `aria-activedescendant` while an option is active |
| `<ul>` | `listbox` | The same label (`aria-labelledby`) |
| `<li>` | `option` | Its value, plus the hint; `aria-selected="true"` on the active option |
| `<p class="visually-hidden">` | `status` | "5 results", polite ([WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)) |

A screen reader user hears, for example, "City, combobox, collapsed, editable", then after typing
"ber": "2 results", and on Down Arrow "Berlin, 1 of 2". Following the APG example, `aria-selected`
marks the option with visual focus; once accepted, the value lives in the input.

## Alternatives considered

- **`<datalist>` alone.** Kept as the no-script fallback. Rejected as the whole answer: the popup
  cannot be styled, differs between engines, gives no result count and is unreliable with some
  assistive technology.
- **`<select>` as the fallback.** Rejected: a select allows only its options and its enhanced form
  would be a select-only combobox; this pattern is free text with suggestions. Use `<select>` when
  the value must be one of a fixed set.
- **Customizable select (`appearance: base-select`).** The
  [customizable select](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)
  work ([`appearance`](https://developer.mozilla.org/en-US/docs/Web/CSS/appearance),
  [Open UI explainer](https://open-ui.org/components/customizable-select.explainer/)) makes the
  `<select>` popup stylable. It is not interoperable yet, and it is still a select: no free text and
  no typing to filter. When it ships everywhere it is the answer for select-only comboboxes.
- **Open UI combobox research.** The [Open UI combobox explainer](https://open-ui.org/components/combobox.explainer/)
  explores a native, stylable combobox element. Nothing has shipped; we follow its direction (a
  native input plus options in the DOM) so a future element can replace the component.
- **Moving DOM focus into the list.** Rejected: the APG list autocomplete pattern keeps focus in
  the input so typing can continue; `aria-activedescendant` conveys the active option.
- **A popover in the top layer.** Rejected for now; see Our choice above.

## Prior art

- [APG Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) and its
  [editable combobox with list autocomplete example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/).
- [GOV.UK accessible-autocomplete](https://github.com/alphagov/accessible-autocomplete).
- [Adrian Roselli: Under-Engineered Comboboxen?](https://adrianroselli.com/2023/06/under-engineered-comboboxen.html),
  on how far native `<datalist>` gets you.
- [MDN `combobox` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/combobox_role)
  and [`aria-activedescendant`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-activedescendant).

## Mapping to a future standard

The contract is "a text input with a list of suggestions it owns". The markup is already the
native one (`<input list>` and `<datalist>`), so if browsers make the datalist popup stylable and
accessible, or ship the combobox element Open UI is researching, removing the `<dui-combobox>`
wrapper and its script is all a page needs to do.

## Open questions

- Should the list flip above the input near the bottom of the viewport? That needs anchor
  positioning (inside `@supports`) or a popover in the top layer.
- Should matching text in each option be marked, for example with `<mark>`?
- Should the component set `aria-busy` on the listbox while the page loads options?
- Should a select-only combobox wait for customizable `<select>` instead of a second component?
