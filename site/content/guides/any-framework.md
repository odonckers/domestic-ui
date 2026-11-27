---
title: Use it with any framework
summary: The markup is the contract and the framework only holds state. The same three views, built six ways, show how.
---
domestic-ui has no React, Vue or Svelte package, and it does not need one. Everything it styles is a native element, a class, a `data-*` attribute or a custom element, and every templating language can write those. So a framework's only job is the one it is good at: keeping state and turning it into attributes and text.

## The pattern

1. **Write the markup first.** Copy it from the docs (every example comes from [`examples/`](https://github.com/odonckers/domestic-ui/tree/main/examples)) as plain HTML. It renders correctly with no script.
2. **Load the stylesheet once.** Link or import [`css/domestic.css`](https://github.com/odonckers/domestic-ui/blob/main/css/domestic.css). Bundlers keep its [cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer), so your own CSS, if you write any, wins without a specificity fight.
3. **Import the web components you use.** Each `dui-*` element is a [custom element](https://html.spec.whatwg.org/multipage/custom-elements.html) in light DOM, so the framework renders its children like any other markup and the element upgrades it in place.
4. **Bind state to attributes and text.** The framework decides *what* is true (which order is selected, whether the table is compact). The markup says it the standard way: `aria-current="page"`, `hidden`, `data-density="compact"`, a `role="status"` message.

Nothing in the view knows which framework rendered it. A coding agent can write the markup without a framework in mind, and a person can move a view from one framework to another by changing only the bindings.

## One view, six ways

The [demo apps](site:demos.html) build the same dashboard, account settings and orders views with plain HTML, React, Angular, Astro, Vue and Svelte. The markup is the same in each one, and one shared checker (axe in light and dark, small screens, and a scripted walk through the orders view) runs against all six in CI. Only the state layer changes:

| App | Orders view state | Custom elements |
| --- | --- | --- |
| Plain HTML | A short module script reads the form and toggles attributes | Nothing to set up |
| React | [`useState`](https://react.dev/reference/react/useState) | React 19 [passes custom element attributes through](https://react.dev/reference/react-dom/components#custom-html-elements); a `.d.ts` declares the tags for TypeScript |
| Angular | [Signals](https://angular.dev/guide/signals) | [`CUSTOM_ELEMENTS_SCHEMA`](https://angular.dev/api/core/CUSTOM_ELEMENTS_SCHEMA) on the component |
| Astro | Static HTML plus one [client script](https://docs.astro.build/en/guides/client-side-scripts/) | Nothing to set up |
| Vue | [`ref` and `computed`](https://vuejs.org/guide/essentials/reactivity-fundamentals.html) | [`isCustomElement`](https://vuejs.org/guide/extras/web-components.html#using-custom-elements-in-vue) in the Vite plugin options |
| Svelte | [`$state` and `$derived`](https://svelte.dev/docs/svelte/$state) runes | Nothing to set up ([custom elements](https://svelte.dev/docs/svelte/custom-elements) render as is) |

The source of each view in each app is listed under [Views](site:demos.html#views).

## What the framework should not do

- **Restyle.** No component library wrapper, no class soup, no inline styles beyond setting a documented custom property such as `--stack-gap`. Theme through the [tokens](site:tokens/index.html).
- **Replace a native element.** Keep `<button>`, `<a href>`, `<form>`, `<dialog>`, `<details>` and `<table>`, so focus, keyboard and form behavior come from the browser.
- **Fight the web components.** `<dui-table>` sorts and selects rows in place, so the framework keeps every row rendered and hides filtered rows with `hidden` instead of removing them. Our choice: hiding over removing, because it keeps the row nodes the web component already enhanced.
- **Break forms without script.** Give forms a real `method` and `action`. The framework's submit handler improves them; it does not make them work.

## Why this matters

Design systems today are mostly published per framework, so the same button is rewritten for each one and the markup drifts. HTML already has a component model that every framework understands: elements, attributes and [custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements). Keeping structure in the document and state in JavaScript is [progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement) applied to a whole design system.
