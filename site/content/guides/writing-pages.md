---
title: Writing pages with no CSS
summary: The contract for people and coding agents: write semantic HTML in the documented vocabulary, add a web component only where HTML has no element, and the page is styled, themed and accessible with no CSS of its own.
full: true
---
A page built this way links one stylesheet and writes no CSS. Everything it looks like comes from the elements it uses, a few documented attributes, and the [tokens](site:tokens/index.html) a theme sets. **Our choice:** a closed vocabulary rather than utility classes, so a page says what each part is, not how it should look, and a checker can tell when a page leaves the system.

## The rules

1. Link `css/domestic.css` once, in `<head>`. Optionally link a theme from `css/themes/` after it and set `data-theme` on `<html>`.
2. Write no `<style>` element and no `style` attribute, except to set a layout primitive's documented custom property (`--stack-gap`, `--grid-min`, `--cluster-justify`, …) or a semantic `--dui-*` token.
3. Use the native element that already has the meaning: `<button>`, `<a href>`, `<dialog>`, `<details>`, `<label>`, `<fieldset>`, `<table>`, `<search>`, `<time>`. The [first rule of ARIA](https://www.w3.org/TR/using-aria/#rule1) applies: no `role` where an element exists.
4. Use only the attributes, words and classes in the [vocabulary](#the-vocabulary) below. A word that is not listed does nothing, so it is a mistake, not a style.
5. Give each page the landmarks in the [skeleton](#an-application-page): a skip link, one `<header>`, a labelled `<nav>`, one `<main id>` and a `<footer>`, and exactly one `<h1>` ([WCAG 2.4.1](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html), [1.3.1](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)).
6. Label every control with a `<label for>` or a wrapping `<label>`, and name every landmark and region you have more than one of with `aria-label` or `aria-labelledby` ([WCAG 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)).
7. Load `web-components/<name>.js` as a module for each `dui-*` element on the page. Without it the markup still works as plain HTML ([progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)).
8. Check the page from a clone of this repository: `node scripts/check-markup.mjs page.html` fails on a `<style>`, an undocumented attribute, word or class, an inline style that sets anything else, and a `dui-*` element whose module is not loaded. Then check it with [axe](https://github.com/dequelabs/axe-core) and at 320px wide ([WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)).

Compose before you invent: most interface "components" are arrangements of elements that already look finished together, such as a sign-in card (a `data-card` holding a form), a stat row (a `data-dashboard` of headed sections) or a confirm dialog (a `data-dialog` with a `<footer>` of buttons). This is rung 3 of the [decision ladder](https://github.com/odonckers/domestic-ui/blob/main/docs/ARCHITECTURE.md#3-the-decision-ladder). When a page needs something no composition can say, that is a gap in domestic-ui: [open an issue](https://github.com/odonckers/domestic-ui/issues/new) instead of adding CSS to the page. The vocabulary is part of the [public API](https://github.com/odonckers/domestic-ui/blob/main/docs/ARCHITECTURE.md#4-public-api-and-naming).

## An application page

The frame of every app screen: the [app shell](site:patterns/app-shell.html) with its sidebar, then a [page header](site:components/organisms/page-header.html) and the content. Swap the [dashboard](site:patterns/dashboard.html) for a [data table](site:patterns/data-table.html), [large form](site:patterns/large-forms.html) or [list-detail](site:patterns/list-detail.html). The [plain HTML demo](https://github.com/odonckers/domestic-ui/tree/main/demos/vanilla) has full dashboard, settings and orders screens written the same way.

{{page: examples/pages/app-page.html}}

## The vocabulary

Every attribute, word, class, custom element and custom property a page may use, read from the API comments in `css/` (the same list the checker uses). Each attribute links to its docs page. Native attributes (`aria-current`, `aria-sort`, `open`, `popover`, `closedby`) are not listed because they are HTML.

{{vocabulary}}

## Which pattern for which job

| You need | Use |
| --- | --- |
| The frame of an app: bar, sidebar, content | [App shell](site:patterns/app-shell.html) |
| A title, description and actions at the top of a screen | [Page header](site:components/organisms/page-header.html) |
| Summary numbers and panels that reflow | [Dashboard](site:patterns/dashboard.html) |
| A grid of teasers, each with one link | [Card](site:patterns/card.html) in a [`.grid`](site:layouts/grid.html) |
| Rows of records, sorting, selection | [Data table](site:patterns/data-table.html) with `<dui-table>` |
| Narrowing a list or table | [Filter bar](site:patterns/filter-bar.html) |
| A long form in groups, with Save at the bottom | [Large forms](site:patterns/large-forms.html) and the [action bar](site:layouts/action-bar.html) |
| Settings, or a list beside the selected item | [List-detail](site:patterns/list-detail.html) |
| Views of one thing, one at a time | [Tabs](site:patterns/tabs.html), only when the views are peers; otherwise links |
| A confirmation or a short task on top of the page | [Dialog](site:patterns/dialog.html) |
| Actions behind one button | [Menu button](site:patterns/menu-button.html) |
| A status message | [Alerts](site:patterns/alerts.html): inline, live or a toast |
| Show more or less | [Disclosure](site:patterns/disclosure.html) |
