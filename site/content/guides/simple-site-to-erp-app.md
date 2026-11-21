---
title: From a simple site to an ERP app
summary: Five steps from a plain content page to a dense business application, with what is available today.
---
Each step builds on the last; stop at any step. Statuses are as of this build.

## Step 1: a plain content page

Link `css/domestic.css` and write semantic HTML; the [base layer](site:components/base.html) styles it with no classes. Arrange content with the layout primitives:

{{layouts}}

Theme with semantic [tokens](site:tokens/index.html).

## Step 2: site navigation

{{patterns: nav, breadcrumb, search, pagination}}

## Step 3: interactive widgets

Use a native element where one exists, and an APG pattern where not:

{{patterns: disclosure, tabs, dialog, popover, menu-button, toolbar, typeahead, alerts, card}}

## Step 4: the app shell

Frame the app with navigation and context sidebars, then lay out each screen:

{{patterns: app-shell, list-detail, split, dashboard}}

## Step 5: data-heavy screens

Records in a native `<table>`, a filter bar, grouped forms and compact density:

{{patterns: data-table, filter-bar, large-forms, density}}
