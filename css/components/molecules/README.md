# Molecules

Molecules are small groups of native elements and [atoms](../atoms/README.md): a dialog with
a header and actions, a navigation list, tabs, a card. Each one starts from the native
element that already does the job. Where HTML has none, it follows the matching
[APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/). Where there is no pattern either,
the contract is written as an [explainer](../../../explainers/README.md).

Every molecule:

- lives in one file here, imported into the `components` layer by
  [`css/domestic.css`](../../domestic.css) after the atoms;
- has **one** API: a `data-<molecule>` attribute holding space-separated words (matched with `~=`),
  a native element or ARIA role, or, where HTML cannot do the behavior, one small
  [web component](../../../web-components/README.md); state lives in native attributes and ARIA
  (`open`, `aria-current`, `aria-selected`, `aria-expanded`, `aria-pressed`, `hidden`);
- documents itself in the header comment of its file: summary, accessibility notes, `API`,
  `Example`, `Keyboard` and every spec URL;
- uses only semantic `--dui-*` tokens (`npm run lint:tokens` checks `css/components/**`);
- has an example page under [`examples/molecules/`](../../../examples/molecules/index.html) that is
  validated, checked with axe in light and dark (with dialogs, popovers and menus open, every tab
  selected and every group expanded), and tested from the keyboard in Chromium, Firefox and WebKit.

## Index

| Molecule | File | API | Standard or Our choice | Example | Explainer |
| --- | --- | --- | --- | --- | --- |
| Disclosure and accordion | [`disclosure.css`](disclosure.css) | `<details>`/`<summary>`; `data-disclosure="accordion"` on a wrapper, `data-disclosure="plain"` on a `<details>`; native `name` for exclusive groups | [WHATWG `details`](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element), [APG Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), [APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) | [disclosure.html](../../../examples/molecules/disclosure.html) | none |
| Dialog and drawer | [`dialog.css`](dialog.css) | `data-dialog="[drawer] [start \| end]"` on `<dialog>`; `command`/`commandfor`, `closedby` | [WHATWG `dialog`](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element), [APG Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/); drawer is Our choice | [dialog.html](../../../examples/molecules/dialog.html) | [drawer.md](../../../explainers/drawer.md) |
| Popover and tooltip | [`popover.css`](popover.css) | `data-popover="[block-start \| inline-start \| inline-end]"` on a `[popover]`; `role="tooltip"` on a `popover="hint"` inside `<dui-tooltip>` | [WHATWG popover](https://html.spec.whatwg.org/multipage/popover.html), [CSS Anchor Positioning](https://drafts.csswg.org/css-anchor-position-1/), [APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) (work in progress), [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) | [popover.html](../../../examples/molecules/popover.html) | none |
| Navigation list | [`nav.css`](nav.css) | `data-nav="vertical \| horizontal"` on `<nav aria-label>`; `aria-current="page"`; `<details>` groups; optional `aria-hidden` `<svg>` icons; `vertical` is also the app shell's sidebar navigation | [APG Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/), [MDN `aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current) | [nav.html](../../../examples/molecules/nav.html) | none |
| Breadcrumb | [`breadcrumb.css`](breadcrumb.css) | `data-breadcrumb` on `<nav aria-label="Breadcrumb">`; `aria-current="page"` | [APG Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) | [breadcrumb.html](../../../examples/molecules/breadcrumb.html) | none |
| Tabs | [`tabs.css`](tabs.css) | `<dui-tabs>` around a `<nav aria-label>` of in-page links and `<section id>` panels; `activation="manual"`; styles `role="tablist" \| "tab" \| "tabpanel"` | [APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | [tabs.html](../../../examples/molecules/tabs.html) | none |
| Menu button | [`menu-button.css`](menu-button.css) | `<dui-menu>` around a `<button popovertarget>` and a `[popover][data-popover]` of buttons | [APG Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) | [menu-button.html](../../../examples/molecules/menu-button.html) | none |
| Toolbar | [`toolbar.css`](toolbar.css) | `role="toolbar"` + `aria-label` on `<dui-toolbar>`; `aria-orientation`; `aria-pressed` | [APG Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) | [toolbar.html](../../../examples/molecules/toolbar.html) | none |
| Pagination | [`pagination.css`](pagination.css) | `data-pagination` on `<nav aria-label="Pagination">`; `aria-current="page"`; `<a>` without `href` for a disabled end | Our choice (no native element, no APG pattern) | [pagination.html](../../../examples/molecules/pagination.html) | [pagination.md](../../../explainers/pagination.md) |
| Search field | [`search.css`](search.css) | None: `<search>` > `<form>` with a labelled `<input type="search">` and a submit button | [WHATWG `search`](https://html.spec.whatwg.org/multipage/grouping-content.html#the-search-element), [MDN `search`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/search) | [search.html](../../../examples/molecules/search.html) | none |
| Combobox (typeahead) | [`combobox.css`](combobox.css) | `<dui-combobox>` around a `<label>`, an `<input list>` and its `<datalist>`; `dui-combobox-filter` event and `setOptions()` for options loaded by the page | [APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) (list autocomplete), [WHATWG `datalist`](https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element) | [combobox.html](../../../examples/molecules/combobox.html) | [combobox.md](../../../explainers/combobox.md) |
| Card | [`card.css`](card.css) | `data-card` and `data-card="link"` on `<article>` | Our choice (no native element, no APG pattern) | [card.html](../../../examples/molecules/card.html) | [card.md](../../../explainers/card.md) |
| Alert and toast | [`alerts.css`](alerts.css) | `data-alert="info \| success \| warning \| danger"`; `role="status"` / `role="alert"`; `<dui-toaster data-alert="toasts" role="status">` | [MDN `status`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role), [MDN `alert`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role), [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html); toast region is Our choice | [alerts.html](../../../examples/molecules/alerts.html) | [toast.md](../../../explainers/toast.md) |

All molecules together: [examples/molecules/index.html](../../../examples/molecules/index.html).

## Not shipped, and why

| Candidate | Decision |
| --- | --- |
| Combobox with inline autocomplete, select-only combobox, multi-select | Not added. `<dui-combobox>` is the APG list autocomplete variant; a select-only combobox is a `<select>`, and inline completion and multiple values need their own use cases. |
| Vertical tabs | Not added. The APG allows them (`aria-orientation="vertical"`), but they need a different layout and Up/Down keys; add them with a real use case. |
| Menubar, submenus | Not added. Application menubars are rare on the web, and submenus are hard to use; a menu button covers actions. |
| Arrow-key navigation between accordion headers | Not added. It is optional in the APG Accordion pattern, and native `<details>` gives every summary a Tab stop. |
| Tree view for navigation | Not used. An [APG Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) is for hierarchies users navigate as data (file trees), with one Tab stop and arrow keys; site navigation is links, so the sidebar navigation is disclosure groups and links ([APG Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)). |
| Auto-dismissing toasts | Not added on purpose; see Our choices and [toast.md](../../../explainers/toast.md). |
| `interestfor` tooltips | Not used yet. It is the coming standard for hover and focus invokers but ships only in Chromium; `<dui-tooltip>` does the job until it is interoperable. |

## Our choices

Each is a choice between valid options, not a standard.

- **Our choice:** native first, even where it differs from the APG example. The accordion is
  `<details name>`, so there are no heading wrappers and no arrow keys between headers (both
  optional in the APG); nav groups are `<details>` rather than scripted disclosure buttons, so they
  do not close on <kbd>Esc</kbd>. Both work with no script and keep find-in-page.
- **Our choice:** the drawer is a `<dialog>` variant (`data-dialog="drawer"`), not a new element or a
  popover, so it gets modality, inertness, focus handling and <kbd>Esc</kbd> from the browser.
  See [drawer.md](../../../explainers/drawer.md).
- **Our choice:** dialog and drawer motion uses `@starting-style` and
  `transition-behavior: allow-discrete`, declared after a plain transition, so engines without them
  simply open and close instantly. Duration tokens are `0s` under reduced motion.
- **Our choice:** anchored popovers fall back to the bottom center of the viewport where CSS anchor
  positioning is missing, rather than the browser's default center, so they never cover the
  middle of the content.
- **Our choice:** automatic tab activation (selection follows focus), as the
  [APG recommends](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#deciding-when-to-make-selection-automatically-follow-focus)
  when panels show without delay; `activation="manual"` is one attribute away.
- **Our choice:** tabs are written as a `<nav>` of in-page links and `<section>` panels, so they
  read as a table of contents with JavaScript off. Once upgraded, each panel's first heading is
  visually hidden (it repeats the tab label) but stays in the accessibility tree.
- **Our choice:** `<dui-menu>` adds `role="menu"` and `role="menuitem"` itself. Without the script
  there are no menu roles, so assistive technology is never promised arrow keys that do not work.
  A list of links is never a menu; use a disclosure.
- **Our choice:** `<dui-combobox>` upgrades a native `<input list>` + `<datalist>`, not a `<select>`,
  because the value is free text and the upgrade reuses the same input and options. Its listbox is
  positioned under the input inside the component (not a top-layer popover), so it is never wider
  than the field. Options are filtered by "contains", case-insensitive, like the native datalist
  popups in Chromium and Firefox. See [combobox.md](../../../explainers/combobox.md).
- **Our choice:** `<dui-toolbar>` keeps `role="toolbar"` in the markup, because a labelled group of
  Tab stops is still correct without the script; only the roving focus is added.
- **Our choice:** navigation lists (nav, tabs, pagination) drop the link underline, because
  their role is clear from the list ([F73](https://www.w3.org/WAI/WCAG22/Techniques/failures/F73) is
  about links in running text); hover brings it back. Breadcrumb links keep it, because they read as text.
- **Our choice:** "current" is never color alone: the nav item gets an accent bar, a tint and
  bold text (in a sidebar too: the nav molecule is the app shell's sidebar navigation, extended with
  decorative icons rather than forked into an organism, so there is one navigation API); the current page in pagination is filled and bold; the selected tab gets a bar and
  full-strength text.
- **Our choice:** the current page in pagination stays a link with `aria-current="page"`, and a
  disabled Previous or Next is an `<a>` with no `href`, which HTML defines as a placeholder: not
  focusable and not a link. See [pagination.md](../../../explainers/pagination.md).
- **Our choice:** a clickable card puts the link on its heading and stretches the link's hit area with
  a pseudo-element, so the card's accessible name is the heading and secondary actions in the
  footer stay separate links. See [card.md](../../../explainers/card.md).
- **Our choice:** alert tones start with a word in the markup ("Warning:"), like the field's
  "Error:", and add a decorative icon drawn in CSS with empty alternative text.
- **Our choice:** an `info` tone with its own token (`--dui-color-info`) instead of reusing the accent,
  so a green or red brand accent never makes an informational message look like success or danger.
- **Our choice:** toasts never dismiss themselves and never take focus; each has a Dismiss button,
  and the region is a fixed element in the page (not a popover) so server-rendered messages show
  with JavaScript off. See [toast.md](../../../explainers/toast.md).
- **Our choice:** the tooltip uses inverse colors (`--dui-color-surface-inverse` and
  `--dui-color-text-inverse`, derived from the text and surface tokens), so every theme gets a
  readable tooltip with no extra overrides.
