# Code highlighting

Status: shipped in domestic-ui as CSS only. The page registers the ranges.
CSS: [`css/base/typography.css`](../css/base/typography.css) ·
Tokens: [`css/tokens/semantic.css`](../css/tokens/semantic.css) ·
Example: [`examples/base.html`](../examples/base.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

Code samples read faster when keywords, strings and tags stand out. Most highlighters wrap every
token in a `<span class="...">`, which multiplies the DOM, ties the markup to one library's class
names, and puts colors in a theme file that ignores the system's tokens and dark scheme. HTML has
no element or attribute for a token's kind.

## Use cases

- Documentation pages that show HTML, CSS and JavaScript snippets.
- A product's own help or settings page that shows a config file.

## Goals

- No change to the markup: a `<pre><code>` stays plain text in the DOM.
- Colors come from semantic tokens, follow the color scheme and can be themed.
- Every color meets 4.5:1 on the code background in light and dark (WCAG 1.4.3).
- Without JavaScript the code is plain text, which is fine.
- No build step for users.

## Non-goals

- A tokenizer. Which ranges get which name is up to the page; the domestic-ui docs site registers
  them from `site/assets/site.js`.
- Languages other than HTML, CSS and JavaScript, line numbers, and diff markers.
- Bold or italic tokens: `::highlight()` cannot set `font-weight` or `font-style`.

## Proposed markup and API

The system ships one `::highlight()` rule per name, each setting `color` from a token. The page
creates [`Highlight`](https://developer.mozilla.org/en-US/docs/Web/API/Highlight) objects from
`Range`s over the text in `<code>` and registers them in `CSS.highlights` under these names:

| Highlight name | Covers | Token |
| --- | --- | --- |
| `dui-code-keyword` | JS keywords (`const`, `return`, `import`), CSS at-rules (`@layer`, `@media`) | `--dui-color-code-keyword` |
| `dui-code-string` | Quoted strings in JS and CSS, HTML attribute values | `--dui-color-code-string` |
| `dui-code-comment` | `<!-- -->`, `/* */` and `//` comments | `--dui-color-code-comment` |
| `dui-code-tag` | HTML tag names, CSS selectors | `--dui-color-code-tag` |
| `dui-code-attribute` | HTML attribute names | `--dui-color-code-attribute` |
| `dui-code-property` | CSS properties and custom properties, JS object properties | `--dui-color-code-property` |
| `dui-code-number` | Numbers with their units (`0.5rem`, `100%`, `42`) | `--dui-color-code-number` |
| `dui-code-punctuation` | `<`, `>`, `</`, `/>`, `{`, `}`, `(`, `)`, `[`, `]`, `:`, `;`, `,`, `=` | `--dui-color-code-punctuation` |

Anything not covered (CSS keyword values, identifiers, text content) stays `--dui-color-text`.
A range SHOULD NOT belong to two names; if it does, the later-registered highlight wins
([priority](https://drafts.csswg.org/css-highlight-api-1/#priorities)).

```js
const keywords = new Highlight(...rangesFor("keyword"));
CSS.highlights.set("dui-code-keyword", keywords);
```

**Our choice:** no `dui-code-value` name. HTML attribute values are strings, and coloring every
CSS keyword value made declarations harder to scan, not easier.

## Keyboard interaction

None. Highlights do not change focus, selection or the text.

## Accessibility mappings

- Highlights are not in the accessibility tree; screen readers read the plain text, as with no
  highlighting at all.
- Color is the only difference between tokens, and nothing depends on it (WCAG 1.4.1).
- In forced-colors mode every highlight is `CanvasText`.
- Text selection (`::selection`) still paints over highlights.

## Alternatives considered

- **`<span>` markup with our own classes.** Rejected: many extra elements per snippet, and the
  markup copied from the docs would carry presentational spans.
- **Prism or highlight.js classes (`.token.keyword`, `.hljs-keyword`).** Rejected: ties the
  system to one library's class names and its themes, which do not use our tokens.
- **Server-side highlighting with inline styles.** Rejected: literal colors bypass theming and
  the dark scheme.

## Prior art

- [CSS Custom Highlight API Module Level 1](https://drafts.csswg.org/css-highlight-api-1/)
- [MDN: CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API),
  including its syntax highlighting example.
- [Prism](https://prismjs.com/) and [highlight.js](https://highlightjs.org/) token names, which
  the names above loosely follow.

## Open questions

- Should JS template literals and regular expressions get names of their own?
