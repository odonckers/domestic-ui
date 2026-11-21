# Organisms

Organisms are larger sections of a screen built from [molecules](../molecules/README.md),
[atoms](../atoms/README.md) and native elements: the header of a page, the filters above a list, a long
form split into sections, a table of records. Each one starts from the native elements that already do the job
(`<header>`, `<search>`, `<form>`, `<fieldset>`, `<table>`); only the data table has a web component,
[`<dui-table>`](../../../web-components/dui-table.js), for sorting and selection, which HTML cannot do. Where
there is no standard or APG pattern for the arrangement, the file header says so with an **Our choice:** line.

Every organism:

- lives in one file here, imported into the `components` layer by
  [`css/domestic.css`](../../domestic.css) after the molecules;
- has **one** API: a `data-<organism>` attribute (matched with `~=` when it takes words) on the native
  element that holds it; the layout of the children follows from their elements, and state lives in
  native attributes and ARIA (`role="status"`, `aria-current`);
- adapts to the width of its own box with a
  [container query](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries),
  not the viewport, so it fits a full page, a split region or the main area of an application alike,
  from 320px up (the data table instead scrolls in its own
  [`data-scroll`](../../layout/scroll.css) container, so the page never does);
- documents itself in the header comment of its file: summary, accessibility notes, `API`, `Example`,
  `Keyboard` where it has one, its breakpoint and every spec URL;
- uses only semantic `--dui-*` tokens (`npm run lint:tokens` checks `css/components/**`) and works under
  `data-density="compact"`;
- has an example page under [`examples/organisms/`](../../../examples/organisms/index.html) that is
  validated, checked with axe in light and dark and at 320 and 375 pixels wide, and tested in Chromium,
  Firefox and WebKit.

## Index

| Organism | File | API | Example | Specs |
| --- | --- | --- | --- | --- |
| Page header | [`page-header.css`](page-header.css) | `data-page-header` on a `<header>` inside `<main>`: optional breadcrumb `<nav>`, heading, optional `<p>`, actions last | [page-header.html](../../../examples/organisms/page-header.html) | [WHATWG `header`](https://html.spec.whatwg.org/multipage/sections.html#the-header-element), [APG Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/); the arrangement is Our choice |
| Filter bar | [`filter-bar.css`](filter-bar.css) | `data-filter-bar` on `<search>` > `<form>` of labelled fields with the buttons last, then a `role="status"` result count | [filter-bar.html](../../../examples/organisms/filter-bar.html) | [WHATWG `search`](https://html.spec.whatwg.org/multipage/grouping-content.html#the-search-element), [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html); the arrangement is Our choice |
| Large forms (form sections) | [`large-forms.css`](large-forms.css) | `data-form-sections` on `<form>`; each child `<section>` has a `<header>` (heading, description) and one body of fields | [large-forms.html](../../../examples/organisms/large-forms.html) | [WHATWG `form`](https://html.spec.whatwg.org/multipage/forms.html#the-form-element), [WHATWG `fieldset`](https://html.spec.whatwg.org/multipage/form-elements.html#the-fieldset-element), [WAI forms tutorial](https://www.w3.org/WAI/tutorials/forms/grouping/) |
| Data table | [`data-table.css`](data-table.css) | `data-table="[sticky]"` on a `<table>` with a `<caption>` and `th[scope]`; `data-table="number"` and `data-table="sortable"` on cells; `aria-sort`, `aria-busy`; `<dui-table>` adds sorting and selection | [data-table.html](../../../examples/organisms/data-table.html) | [WHATWG `table`](https://html.spec.whatwg.org/multipage/tables.html#the-table-element), [APG Sortable Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/), [WAI tables tutorial](https://www.w3.org/WAI/tutorials/tables/) |

All organisms together: [examples/organisms/index.html](../../../examples/organisms/index.html). The page
layouts they sit in (list-detail, split, dashboard, the sticky action bar, the app shell) are in [`css/layout/`](../../layout/).

## Not shipped, and why

| Candidate | Decision |
| --- | --- |
| Filters that apply on every keystroke | Not built in. A page MAY apply on change, but the default is a submit button, so several filters can be set without interruptions and the form works without JavaScript. |
| A `<fieldset>` as the top-level form section | Not used. A `<legend>` cannot be placed in a grid column; sections are headed `<section>` elements, with fieldsets for groups inside them. |
| App shell, sidebar navigation | Not organisms. The app shell is a layout ([`app-shell.css`](../../layout/app-shell.css), with [`<dui-app-shell>`](../../../web-components/dui-app-shell.js)) and the sidebar navigation is the [nav molecule](../molecules/nav.css) (`data-nav="vertical"`); see [app-shell.md](../../../explainers/app-shell.md). |
| Tree view for navigation | Not used. An [APG Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) is for hierarchies users navigate as data; site navigation is disclosure groups and links. |
| Editable cells, arrow keys between cells | Not in the data table. Cells that are edited in place make the table an [APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), a different widget with its own keyboard model. |
| Announcing the new order after a sort | Not done. As in the APG Sortable Table example, `aria-sort` on the header is the announcement; a caption hint says which headers sort. |
| Sorting several columns at once, resizing or hiding columns | Not built in. Cancel `dui-table-sort` and sort on the server for multi-column orders. |

## Our choices

Each is a choice between valid options, not a standard.

- **Our choice:** the page header takes its layout from its children's elements (a `<nav>` breadcrumb, a
  heading, a `<p>`, and a last child of actions) rather than extra attributes, so it is the markup any page
  already writes; `<header>` inside `<main>` is not the banner landmark.
- **Our choice:** the filter bar is a plain `<form method="get">` in `<search>` with an Apply button, so the
  filters live in the URL, work with JavaScript off, and do not interrupt screen reader users while they set
  several; the result count is a `role="status"` element present from page load, so changes are announced.
- **Our choice:** form sections are `<section>` elements with a `<header>` and one body, not fieldsets with
  legends, because a legend cannot be placed in a grid column and headed sections show up in the headings
  list; related controls are still grouped in a `<fieldset>` inside the body.
- **Our choice:** the data table's sortable headers are plain text in the markup and `<dui-table>` turns them into
  buttons, so with JavaScript off there are no buttons that do nothing; following the
  [APG Sortable Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/) example,
  `aria-sort` is on the sorted header only, the arrow is hidden from assistive technology and the caption gets a
  visually hidden hint once the buttons exist.
- **Our choice:** a selected row is marked by its checked checkbox, a bar on its leading edge and a tint, never
  color alone; the count is a `role="status"` element in the page from load, and the bulk actions are disabled
  until a row is selected. The "select all" checkbox is added by the script, since it would do nothing without it.
- **Our choice:** a sticky table header sticks to the nearest scroll container: put the table in
  `data-scroll="block inline"` (at most `--dui-size-pane` tall), or in no scroll container to stick to the
  viewport. In `data-scroll="inline"` alone it cannot stick.
- **Our choice:** numeric columns are marked per cell (`data-table="number"`), the same attribute as the table,
  because words on the table cannot target a column.
- **Our choice:** every organism and layout switches with a container query on its own box, not a media
  query, because it sits in regions of any width (a split, an app shell's main area). Container query
  conditions cannot read custom properties, so each breakpoint is a length written in the file header.
