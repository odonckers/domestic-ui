// @ts-check
/*
 * scripts/check-markup.mjs: the vocabulary check that backs "Writing pages
 * with no CSS". It reads files, not a browser, so it runs in Chromium only.
 */
import { test, expect } from "@playwright/test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPage, run } from "../scripts/check-markup.mjs";
import { loadVocabulary, undocumentedWords } from "../site/lib/vocabulary.mjs";

const ROOT = new URL("..", import.meta.url).pathname;

test.describe("markup check", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "reads files only; one engine is enough");

  const vocab = loadVocabulary(ROOT);
  /** @type {string} */
  let dir;
  test.beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "dui-markup-"));
  });
  test.afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  /** Check one page body, strictly. @param {string} body */
  const check = (body) => {
    const file = join(dir, `page-${Math.random().toString(36).slice(2)}.html`);
    writeFileSync(file, `<!DOCTYPE html><html lang="en"><head><title>t</title><link rel="stylesheet" href="css/domestic.css"></head><body>${body}</body></html>`);
    return checkPage(vocab, file, true);
  };

  test("reads the vocabulary from the CSS API comments", () => {
    expect(vocab.attributes.get("data-button")?.words).toEqual(new Set(["primary", "secondary", "quiet", "small", "large", "icon"]));
    expect(vocab.attributes.get("data-badge")?.bare).toBe(true); // "(empty means neutral)"
    expect(vocab.attributes.get("data-theme")?.words).toEqual(new Set(["calm", "compact", "soft"]));
    expect([...vocab.classes.keys()].sort()).toEqual(["cluster", "grid", "stack", "visually-hidden"]);
    expect(vocab.properties.has("--stack-gap")).toBe(true);
    expect(vocab.elements.has("dui-table")).toBe(true);
  });

  test("every word a CSS selector matches is documented", () => {
    expect(undocumentedWords(vocab)).toEqual([]);
  });

  test("passes a page written in the vocabulary", () => {
    expect(
      check(`<main id="main" class="stack" style="--stack-gap: var(--dui-space-s); --dui-color-primary: rebeccapurple">
        <h1>Orders</h1><p data-text="lead muted">Hi</p><button type="button" data-button="primary small">Go</button>
        <span data-badge>Draft</span></main>`),
    ).toEqual([]);
  });

  test("flags CSS of the page's own", () => {
    const problems = check(`<style>p { color: red; }</style><p style="margin: 0">x</p><div class="card">x</div>`);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toContain("<style> element");
    expect(problems[1]).toContain('style="margin: 0"');
    expect(problems[2]).toContain('class "card"');
  });

  test("flags undocumented attributes and words", () => {
    const problems = check(`<button data-button="danger">x</button><div data-stat>1</div><div data-scroll>x</div>`);
    expect(problems.map((p) => p.replace(/^\S+ /, ""))).toEqual([
      'data-button="danger": "danger" is not documented (primary, secondary, quiet, small, large, icon)',
      "data-stat is not a domestic-ui attribute",
      "data-scroll needs a value: inline, block",
    ]);
  });

  test("flags a dui-* element that is unknown or not loaded", () => {
    const problems = check(`<dui-menu></dui-menu><dui-stat></dui-stat>`);
    expect(problems.some((p) => p.includes("web-components/dui-menu.js is not loaded"))).toBe(true);
    expect(problems.some((p) => p.includes("<dui-stat> is not a domestic-ui element"))).toBe(true);
    expect(check(`<dui-menu></dui-menu><script type="module" src="web-components/dui-menu.js"></script>`)).toEqual([]);
  });

  test("the repository's pages pass", () => {
    const { files, problems } = run([]);
    expect(problems).toEqual([]);
    expect(files).toBeGreaterThan(40);
  });
});
