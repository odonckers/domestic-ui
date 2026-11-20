---
title: From a simple site to an ERP app
summary: Five steps from a plain content page to a dense business application, and which parts of each step are available today.
---
Each step adds to the one before it, so a site can stop at any step. The lists below come from the [pattern registry](site:patterns/index.html) and show each pattern's status as of this build.

## Step 1: a plain content page

Write semantic HTML and link `css/domestic.css`. Headings, paragraphs, lists, links, tables, forms and `<dialog>` get their look from the base layer with no classes; see [Base elements](site:components/base.html). Arrange content with the layout primitives:

{{layouts}}

Theme by overriding semantic tokens; see [Tokens](site:tokens/index.html) and the [theming example](site:examples/theming.html).

## Step 2: site navigation

Add the main navigation, a breadcrumb trail and a search form:

{{patterns: nav, breadcrumb, search, pagination}}

## Step 3: interactive widgets

Use a native element where one exists (`<details>`, `<dialog>`, `popover`, `<datalist>`), and an APG pattern where one does not:

{{patterns: disclosure, tabs, dialog, popover, menu-button, toolbar, typeahead, alerts, card}}

## Step 4: the app shell

Frame the application with a primary sidebar for navigation and an auxiliary sidebar for context, then lay out each screen as a list with details, a split view or a dashboard:

{{patterns: app-shell, list-detail, split, dashboard}}

## Step 5: data-heavy screens

Show records in a native `<table>`, narrow them with a filter bar, group long forms with `<fieldset>`, and switch to the compact density token where users scan a lot of data:

{{patterns: data-table, filter-bar, large-forms, density}}
