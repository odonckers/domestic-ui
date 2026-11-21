# Organisms

Organisms are larger sections of a screen built from [molecules](../molecules/README.md),
[atoms](../atoms/README.md) and native elements: the header of a page, the filters above a list, a long
form split into sections. Each one starts from the native elements that already do the job (`<header>`,
`<search>`, `<form>`, `<fieldset>`); none of them needs a web component of its own. Where there is no
standard or APG pattern for the arrangement, the file header says so with an **Our choice:** line.

Every organism:

- lives in one file here, imported into the `components` layer by
  [`css/domestic.css`](../../domestic.css) after the molecules;
- has **one** API: a `data-<organism>` attribute (matched with `~=` when it takes words) on the native
  element that holds it; the layout of the children follows from their elements, and state lives in
  native attributes and ARIA (`role="status"`, `aria-current`);
- adapts to the width of its own box with a
  [container query](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries),
  not the viewport, so it fits a full page, a split region or the main area of an application alike,
  from 320px up;
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

All organisms together: [examples/organisms/index.html](../../../examples/organisms/index.html). The page
layouts they sit in (list-detail, split, dashboard, the sticky action bar) are in [`css/layout/`](../../layout/).

## Not shipped, and why

| Candidate | Decision |
| --- | --- |
| Filters that apply on every keystroke | Not built in. A page MAY apply on change, but the default is a submit button, so several filters can be set without interruptions and the form works without JavaScript. |
| A `<fieldset>` as the top-level form section | Not used. A `<legend>` cannot be placed in a grid column; sections are headed `<section>` elements, with fieldsets for groups inside them. |
| Data table, app shell, sidebar navigation | Later sessions of M3b. |

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
- **Our choice:** every organism and layout switches with a container query on its own box, not a media
  query, because it sits in regions of any width (a split, an app shell's main area). Container query
  conditions cannot read custom properties, so each breakpoint is a length written in the file header.
