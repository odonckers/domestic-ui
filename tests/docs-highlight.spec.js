// @ts-check
import { test, expect } from "@playwright/test";
import "./docs-helpers.js";

/*
 * Syntax highlighting on the docs site (site/assets/highlight.js): ranges
 * registered in CSS.highlights under the dui-code-* names, with no change to
 * the code's text or markup. tests/docs-helpers.js builds _site/ once.
 * No docs page has a JavaScript-only block yet, so a fixture page served at
 * /_site/ (routed, not written to disk) loads the real CSS and script with
 * one HTML, one CSS and one JS block.
 */

const FIXTURE = "_site/highlight-fixture.html";
const FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Highlight fixture</title>
    <link rel="stylesheet" href="css/domestic.css">
    <script src="highlight.js" defer></script>
  </head>
  <body>
    <main>
      <pre id="html"><code class="language-html">&lt;!-- A theme --&gt;
&lt;section class="panel" data-theme="forest"&gt;
  &lt;style&gt;[data-theme="forest"] { --dui-radius-control: 0.125rem; }&lt;/style&gt;
  &lt;script type="module"&gt;const n = 42;&lt;/script&gt;
&lt;/section&gt;</code></pre>
      <pre id="css"><code>@layer reset, base;
/* Forest */
[data-theme="forest"] {
  --dui-color-text: light-dark(#1d2a22, #e4ebe3);
  margin-block: 0.5rem;
}</code></pre>
      <pre id="js"><code data-lang="js">// Fit the frame
const frame = document.querySelector("iframe");
frame.style.blockSize = \`\${Math.ceil(42.5)}px\`;</code></pre>
    </main>
  </body>
</html>`;

const NAMES = ["keyword", "string", "comment", "tag", "attribute", "property", "number", "punctuation"];

/** Number of ranges per dui-code-* highlight, or null without the API. @param {import("@playwright/test").Page} page */
const highlightCounts = (page) =>
  page.evaluate((names) => {
    if (!("highlights" in CSS)) return null;
    return Object.fromEntries(names.map((n) => [n, CSS.highlights.get(`dui-code-${n}`)?.size ?? 0]));
  }, NAMES);

/**
 * True when every pre > code on the page still has the text it was served
 * with and no element children (highlighting adds no markup).
 * @param {import("@playwright/test").Page} page
 */
const textUnchanged = (page) =>
  page.evaluate(async () => {
    const served = new DOMParser().parseFromString(await (await fetch(location.href)).text(), "text/html");
    const before = [...served.querySelectorAll("pre > code")].map((c) => c.textContent);
    const after = [...document.querySelectorAll("pre > code")];
    return after.length > 0 && after.length === before.length && after.every((c, k) => c.textContent === before[k] && c.childElementCount === 0);
  });

test.describe("docs syntax highlighting", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`**/${FIXTURE}`, (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: FIXTURE_HTML }));
  });

  test("registers every dui-code-* name for HTML, CSS and JS blocks", async ({ page, browserName }) => {
    await page.goto(FIXTURE);
    const counts = await highlightCounts(page);
    test.skip(counts === null, `CSS Custom Highlight API ('highlights' in CSS) is not supported in this ${browserName} build`);
    for (const name of NAMES) expect(counts?.[name], `ranges in dui-code-${name}`).toBeGreaterThan(0);
    expect(await textUnchanged(page), "code text and markup unchanged").toBe(true);
  });

  test("tokens land on the expected text", async ({ page, browserName }) => {
    await page.goto(FIXTURE);
    test.skip((await highlightCounts(page)) === null, `CSS Custom Highlight API is not supported in this ${browserName} build`);
    const texts = await page.evaluate(() => {
      /** @type {Record<string, string[]>} */
      const out = {};
      for (const [name, hl] of CSS.highlights) out[name] = [...hl].map((r) => String(r));
      return out;
    });
    expect(texts["dui-code-comment"]).toEqual(expect.arrayContaining(["<!-- A theme -->", "/* Forest */", "// Fit the frame"]));
    expect(texts["dui-code-tag"]).toEqual(expect.arrayContaining(["section", "style", "script", "[data-theme="]));
    expect(texts["dui-code-attribute"]).toEqual(expect.arrayContaining(["class", "data-theme", "type"]));
    expect(texts["dui-code-string"]).toEqual(expect.arrayContaining(['"panel"', '"forest"', '"iframe"']));
    expect(texts["dui-code-keyword"]).toEqual(expect.arrayContaining(["@layer", "const"]));
    expect(texts["dui-code-property"]).toEqual(expect.arrayContaining(["--dui-radius-control", "--dui-color-text", "margin-block", "blockSize"]));
    expect(texts["dui-code-number"]).toEqual(expect.arrayContaining(["0.125rem", "42", "#1d2a22", "0.5rem"]));
    // One name per range: no range is in two highlights.
    const all = Object.values(texts).flat().length;
    const unique = await page.evaluate(() => new Set([...CSS.highlights.values()].flatMap((hl) => [...hl])).size);
    expect(unique).toBe(all);
  });

  test("a docs page highlights its real code blocks without changing them", async ({ page, browserName }) => {
    await page.goto("_site/principles/theming.html");
    const counts = await highlightCounts(page);
    test.skip(counts === null, `CSS Custom Highlight API is not supported in this ${browserName} build`);
    for (const name of ["tag", "attribute", "string", "property", "number", "punctuation"]) {
      expect(counts?.[name], `ranges in dui-code-${name}`).toBeGreaterThan(0);
    }
    expect(await textUnchanged(page), "code text and markup unchanged").toBe(true);
  });

  test("a highlighted token takes its color token", async ({ page, browserName }) => {
    await page.goto(FIXTURE);
    test.skip((await highlightCounts(page)) === null, `CSS Custom Highlight API is not supported in this ${browserName} build`);
    const colors = await page.evaluate(() => {
      const code = /** @type {HTMLElement} */ (document.querySelector("#js code"));
      const probe = document.createElement("span");
      probe.style.color = "var(--dui-color-code-keyword)";
      document.body.append(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();
      return { expected, highlight: getComputedStyle(code, "::highlight(dui-code-keyword)").color, text: getComputedStyle(code).color };
    });
    // getComputedStyle() on ::highlight() is not implemented everywhere; it then returns the element's own style.
    test.skip(colors.highlight === colors.text, `getComputedStyle(el, "::highlight()") is not supported in ${browserName}`);
    expect(colors.expected).not.toBe(colors.text);
    expect(colors.highlight).toBe(colors.expected);
  });
});
