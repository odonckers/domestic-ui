# Search dialog (command palette)

Status: used by the domestic-ui docs site; markup and page script over shipped parts, no new component.
CSS: [`css/components/molecules/dialog.css`](../css/components/molecules/dialog.css),
[`css/components/molecules/combobox.css`](../css/components/molecules/combobox.css) ·
Script: [`web-components/dui-combobox.js`](../web-components/dui-combobox.js) plus a few lines of page script ·
Example: [`examples/molecules/search-dialog.html`](../examples/molecules/search-dialog.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

A search dialog has no native element and no APG pattern of its own. It composes two APG patterns,
[Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and the
[Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) list autocomplete variant, on native
[`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) and
[`<input list>`](https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element).
This file records the choices between them: when to load results, how results map to options, and
the keyboard shortcut.

## Problem

A site or app with dozens of pages needs a way to jump to one by typing part of its name. Authors
reach for a "command palette" library, and many get the parts wrong: focus is not moved into the
field or not returned on close, the list is a set of links the arrow keys do not reach, the result
count changes silently, or a single-letter shortcut fires while the user is typing elsewhere.

## Use cases

- Jumping to a docs page, or to a section of one, from anywhere on the site.
- Finding a record, a setting or an action in an app by name.
- Keyboard users opening search without tabbing through the app bar.

## Goals

- The browser does the modal work: `showModal()` (or `command="show-modal"`) makes the page inert,
  moves focus in and returns it on close; no focus-trap script.
- The field is the APG list autocomplete combobox: focus stays in it, results are options, the count
  is announced.
- Nothing broken shows without JavaScript.
- No request outside the page's own origin; the index loads only when someone searches.
- Works at 320px wide.

## Non-goals

- A search engine: ranking, stemming, fuzzy matching or full-text body search.
- Actions with arguments, nested command menus or recent searches.
- A new web component: the pattern is markup plus a little page script.

## Proposed markup and API

- The opener MUST be a `<button>` with `commandfor` naming the dialog and `command="show-modal"`
  ([invoker commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)), with
  `aria-haspopup="dialog"`. Its visible text MUST be its name ("Search"). Page script SHOULD call
  `showModal()` on click where invoker commands are not supported.
- **Our choice:** the opener is `hidden` in the markup and shown by the script that fills the
  results, because without that script the dialog would open on an empty list.
- The dialog MUST be a `<dialog data-dialog closedby="any">` named by its heading with
  `aria-labelledby`. `closedby="any"` adds a click outside to Esc and the close button.
- It MUST hold one `<dui-combobox>` with a visible `<label>`, an `<input list>` with `autofocus`
  (so focus lands in the field, not the close button) and its `<datalist>`.
- Results are the datalist's options: `value` is the text shown and matched, `label` a hint (the
  section). **Our choice:** a page is "Title" and a section is "Title › Heading", so a section
  result says where it is, and every page comes before any section, so a page whose title matches
  is first. There is no other ranking; the combobox's case-insensitive "contains" filter decides.
- **Our choice:** results load on first open (`toggle` on the dialog, or the opener's click), from
  one same-origin JSON file, not on page load, so pages that are only read pay nothing. If loading
  fails the dialog MUST say so in a `role="status"` message and SHOULD try again on the next open.
- Accepting an option (the combobox's `change`) MUST close the dialog, then go to its target. A
  target on the same page MUST move focus to that section's heading
  ([WCAG 2.4.3](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)).
- When nothing matches, the dialog SHOULD show "No results for “…”" as plain text; the combobox's
  status region already announces "No results".
- The list SHOULD sit in the flow of the dialog, not as the combobox's absolutely positioned popup,
  so the dialog's own scrolling never clips it.

```html
<button type="button" commandfor="site-search" command="show-modal" aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K" hidden>Search</button>
<dialog id="site-search" data-dialog closedby="any" aria-labelledby="site-search-title">
  <header>
    <h2 id="site-search-title">Search</h2>
    <button type="button" commandfor="site-search" command="close" data-button="quiet">Close</button>
  </header>
  <dui-combobox>
    <label for="site-search-input">Search the docs</label>
    <input type="text" id="site-search-input" list="site-search-options" autocomplete="off" autofocus>
    <datalist id="site-search-options"></datalist>
  </dui-combobox>
</dialog>
```

Outside a sectioning element a `<header>` is a page banner, so a dialog placed at the end of
`<body>` (as on the docs site) uses a `<div>` for its title row.

## Keyboard interaction

- Cmd-K (macOS) or Ctrl-K: opens the dialog with focus in the field, from anywhere except a text
  field, text area, select or contenteditable outside the dialog; pressed while it is open, keeps
  focus in the field. **Our choice:** a modifier shortcut only and no single key such as `/`, so it
  never fires while typing ([WCAG 2.1.4](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html)).
  The browser's default for the keys is prevented only when the dialog opens or holds focus.
- Typing, Down Arrow, Up Arrow, Enter: as the combobox (filters, moves the active result, goes to it).
- Esc: closes the list, then clears the field, then closes the dialog; focus returns to whatever had
  it before.
- Tab: moves between the field and the close button; the rest of the page is inert.

## Accessibility mappings

| Element | Role | Name / state |
| --- | --- | --- |
| Opener `<button>` | `button` | Its text; `aria-haspopup="dialog"`, `aria-keyshortcuts="Control+K Meta+K"` |
| `<dialog>` | `dialog` (modal) | Its heading (`aria-labelledby`) |
| `<input>` | `combobox` | Its `<label>`; as the [combobox explainer](combobox.md) |
| `<li>` | `option` | "Page › Heading" plus the section hint |
| Load message | `status` | Polite ([WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)) |

A screen reader user hears "Search, dialog", then "Search the docs, combobox, editable", then after
typing "dialog": "15 results", and on Down Arrow "Dialog and drawer, Organisms".

The visible shortcut hint is a `<kbd>` with `aria-hidden="true"`: `aria-keyshortcuts` already
exposes it, and the hint would otherwise join the button's name.

## Alternatives considered

- **A third-party search service or a prebuilt index library** (Algolia, Pagefind). Rejected for the
  docs site: requests to another origin or a new dependency, and a page list does not need full-text
  ranking. A larger site can swap the data source and keep this markup.
- **A list of links instead of a combobox.** Rejected: arrow keys would not move through results and
  the count would not be announced unless rebuilt by hand; the combobox already does both.
- **A non-modal popover under the field.** Rejected: the palette covers the page and the page should
  be inert while it is open, which is what a modal `<dialog>` gives.
- **A `/` shortcut.** Rejected; see Keyboard interaction.
- **Loading the index on page load.** Rejected; see Our choice above.

## Prior art

- [APG Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and
  [APG Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
- [MDN `aria-keyshortcuts`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts).
- [GOV.UK accessible-autocomplete](https://github.com/alphagov/accessible-autocomplete).
- Docs sites such as [MDN](https://developer.mozilla.org/) and [shadcn/ui](https://ui.shadcn.com/)
  open search from the app bar or with Cmd-K / Ctrl-K, for comparison.

## Mapping to a future standard

None known for the palette itself. It is built from native parts: `<dialog>`, invoker commands and
`<input list>`. If a stylable native combobox or datalist ships (see the
[combobox explainer](combobox.md#mapping-to-a-future-standard)), the `<dui-combobox>` wrapper and its
script go away and the dialog markup stays as it is.

## Open questions

- Should results be grouped by section, with each group as an `role="group"` in the listbox?
- Should matching text be marked with `<mark>` in each result?
- Should recent searches be remembered, and where (they would need per-viewer storage)?
