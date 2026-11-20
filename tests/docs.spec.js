// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { HtmlValidate } from "html-validate";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { GENERATED, ROOT, build, extractSnippets, generate } from "../site/build.mjs";
import { unescapeHtml } from "../site/lib/util.mjs";
import { blockExternalRequests, schemes } from "./helpers.js";

/*
 * Docs site checks. The site is built once into _site/ (without touching
 * README.md or llms*.txt, so the stale check stays meaningful) by the
 * process that collects tests; workers only read it. Building in every
 * worker would wipe _site/ while other workers load pages from it.
 * Playwright's webServer serves the repo root, so pages are at /_site/….
 */
if (!process.env.TEST_WORKER_INDEX || !existsSync(join(ROOT, "_site", "index.html"))) build({ writeRoot: false });

const site = generate();
const SITE_DIR = join(ROOT, "_site");
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const read = (/** @type {string} */ path) => readFileSync(path, "utf8");
const htmlValidate = new HtmlValidate(JSON.parse(read(join(ROOT, ".htmlvalidate.json"))));

/** Readable summary of axe violations for the failure message. */
const summarize = (violations) =>
  violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`).join("\n");

/** The markup inside every <pre data-snippet><code>, unescaped. @param {string} html */
const snippetBlocks = (html) => [...html.matchAll(/<pre data-snippet="[^"]*"><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => unescapeHtml(m[1]));

/** Fenced ```html blocks of a Markdown file, closed by a fence of the same length. @param {string} md */
const htmlFences = (md) => [...md.matchAll(/^(`{3,})html\n([\s\S]*?)\n\1$/gm)].map((m) => m[2]);

/**
 * True when `snippet` is consecutive lines of `source` with one common
 * prefix width removed (the documented dedent). Every removed prefix must
 * match `decoration`: whitespace for HTML, whitespace and "*" for CSS comments.
 * @param {string} source
 * @param {string} snippet
 * @param {RegExp} decoration
 */
function isDedentedSlice(source, snippet, decoration) {
  const src = source.split("\n");
  const lines = snippet.split("\n");
  outer: for (let start = 0; start + lines.length <= src.length; start++) {
    let width = -1;
    for (let k = 0; k < lines.length; k++) {
      const s = src[start + k];
      const l = lines[k];
      if (!l) {
        if (!decoration.test(s)) continue outer;
        continue;
      }
      if (!s.endsWith(l)) continue outer;
      const prefix = s.slice(0, s.length - l.length);
      if (!decoration.test(prefix) || (width >= 0 && prefix.length !== width)) continue outer;
      width = prefix.length;
    }
    return true;
  }
  return false;
}

test.describe("docs build", () => {
  test.beforeEach(({ browserName }) => test.skip(browserName !== "chromium", "browser-independent; run once"));

  test("README.md, llms.txt and llms-full.txt are not stale", () => {
    for (const name of GENERATED) {
      const committed = existsSync(join(ROOT, name)) ? read(join(ROOT, name)) : "";
      expect(committed === site.files[name], `${name} is stale; run node site/build.mjs`).toBe(true);
    }
  });

  test("every docs page passes html-validate", async () => {
    const problems = [];
    for (const page of site.pages) {
      const file = join(SITE_DIR, page.path);
      const report = await htmlValidate.validateString(read(file), file);
      for (const result of report.results) {
        for (const m of result.messages) problems.push(`${page.path}:${m.line}:${m.column} ${m.ruleId} ${m.message}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test("every relative href and src resolves inside _site/", () => {
    const broken = [];
    for (const page of site.pages) {
      const html = read(join(SITE_DIR, page.path));
      for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
        const [path, fragment] = unescapeHtml(url).split("#");
        const target = path ? posix.join(posix.dirname(page.path), path) : page.path;
        const file = join(SITE_DIR, target);
        if (target.startsWith("..") || !existsSync(file) || !statSync(file).isFile()) {
          broken.push(`${page.path}: ${url} (no file ${target})`);
          continue;
        }
        if (fragment && target.endsWith(".html") && !read(file).includes(`id="${fragment}"`)) broken.push(`${page.path}: ${url} (no id "${fragment}")`);
      }
    }
    expect(broken).toEqual([]);
  });

  test("copy-paste markup is byte-identical to the example source", () => {
    const withSnippets = site.pages.filter((p) => p.snippets?.length);
    expect(withSnippets.length).toBeGreaterThan(0);
    const llmsFences = htmlFences(read(join(SITE_DIR, "llms-full.txt")));
    for (const page of withSnippets) {
      const snippets = page.snippets ?? [];
      const shown = snippetBlocks(read(join(SITE_DIR, page.path)));
      expect(shown, page.path).toEqual(snippets.map((s) => s.code));
      for (const s of snippets) {
        const source = read(join(ROOT, s.source));
        if (s.from !== "css-comment") expect(extractSnippets(source, s.source).map((x) => x.code), s.source).toContain(s.code);
        const decoration = s.from === "css-comment" ? /^\s*\*?\s*$/ : /^[ \t]*$/;
        expect(isDedentedSlice(source, s.code, decoration), `${page.path}: snippet is not a slice of ${s.source}`).toBe(true);
        expect(llmsFences, `llms-full.txt has the ${s.source} snippet`).toContain(s.code);
        expect(htmlFences(read(join(SITE_DIR, page.path.replace(/\.html$/, ".md")))), `${page.path} Markdown twin`).toContain(s.code);
      }
    }
  });
});

test.describe("docs pages in the browser", () => {
  test.beforeEach(({ browserName }) => test.skip(browserName !== "chromium", "axe on docs runs in Chromium only to keep time down"));

  for (const page of site.pages) {
    const url = `_site/${page.path}`;
    for (const colorScheme of schemes) {
      test(`${page.path} has no axe violations and no external requests (${colorScheme})`, async ({ page: browser, baseURL }) => {
        const external = await blockExternalRequests(browser, baseURL ?? "");
        await browser.emulateMedia({ colorScheme });
        await browser.goto(url, { waitUntil: "networkidle" });
        const { violations } = await new AxeBuilder({ page: browser }).withTags(WCAG_TAGS).analyze();
        expect(violations, summarize(violations)).toEqual([]);
        expect(external, "external network requests").toEqual([]);
      });
    }
  }

  test("pages reflow at 320 CSS pixels without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const overflowing = [];
    for (const p of site.pages) {
      await page.goto(`_site/${p.path}`);
      const result = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        pre: [...document.querySelectorAll("pre")].filter((pre) => pre.scrollWidth > pre.clientWidth).length,
      }));
      if (result.page || result.pre) overflowing.push(`${p.path}: ${JSON.stringify(result)}`);
    }
    expect(overflowing).toEqual([]);
  });

  test("the skip link is the first focusable element and moves focus to main", async ({ page }) => {
    for (const path of ["index.html", site.pages.find((p) => p.section === "components" && p.snippets?.length)?.path ?? "components/index.html"]) {
      await page.goto(`_site/${path}`);
      await page.keyboard.press("Tab");
      const skip = page.locator(":focus");
      await expect(skip, path).toHaveClass(/\bskip-link\b/);
      await expect(skip).toHaveAttribute("href", "#main");
      expect((await skip.boundingBox())?.width ?? 0, "visible on focus").toBeGreaterThan(1);
      await page.keyboard.press("Enter");
      await expect(page.locator("main"), path).toBeFocused();
    }
  });

  test("navigation marks the current page with aria-current", async ({ page }) => {
    for (const p of site.pages) {
      await page.goto(`_site/${p.path}`);
      // A section index is current in both the Docs nav and its section nav.
      const hrefs = await page.locator('a[aria-current="page"]').evaluateAll((all) => all.map((a) => /** @type {HTMLAnchorElement} */ (a).href));
      expect(hrefs.length, p.path).toBeGreaterThan(0);
      for (const href of hrefs) expect(href, p.path).toBe(page.url());
      if (["index.html", "principles/index.html", "tokens/index.html", "components/index.html", "examples.html"].includes(p.path)) {
        await expect(page.locator('nav[aria-label="Docs"] a[aria-current="page"]'), p.path).toHaveCount(1);
      }
    }
  });
});

test("discovery picks up a new component with no site changes", async ({ browserName }) => {
  test.skip(browserName !== "chromium", "browser-independent; run once");
  const fixture = mkdtempSync(join(tmpdir(), "dui-docs-"));
  try {
    for (const path of ["PRINCIPLES.md", "css", "examples", "site/content"]) cpSync(join(ROOT, path), join(fixture, path), { recursive: true });
    const put = (/** @type {string} */ path, /** @type {string} */ text) => {
      mkdirSync(dirname(join(fixture, path)), { recursive: true });
      writeFileSync(join(fixture, path), text);
    };
    put(
      "css/components/atoms/demo.css",
      `/*
 * Atom: demo
 *
 * A demo atom used by the docs discovery test. It keeps a visible focus ring (WCAG 2.4.7).
 *
 * API
 *   class="demo"
 *
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button
 * https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
 */
.demo {
  font-weight: var(--dui-font-weight-strong);
}
`,
    );
    const demo = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Demo · domestic-ui</title>
    <link rel="stylesheet" href="../../css/domestic.css">
  </head>
  <body>
    <main>
      <h1>Demo</h1>
      <!-- dui:snippet -->
      <p class="demo">
        Plain <code>\`\`\`</code> text.
      </p>
      <!-- /dui:snippet -->
      <!-- dui:snippet name="With a link" -->
      <p class="demo"><a href="#x">Link</a></p>
      <!-- /dui:snippet -->
    </main>
  </body>
</html>
`;
    put("examples/atoms/demo.html", demo);
    put("examples/atoms/index.html", demo.replace("Demo · domestic-ui", "Atoms · domestic-ui"));

    const result = build({ root: fixture });
    const out = (/** @type {string} */ path) => read(join(fixture, "_site", path));

    const page = out("components/atoms/demo.html");
    expect(page).toContain("<h1>Demo</h1>");
    expect(page).toContain('src="../../examples/atoms/demo.html"');
    expect(page).toContain('<a href="https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html">');
    expect(page).toContain("It keeps a visible focus ring (WCAG 2.4.7).");
    const expected = ['<p class="demo">\n  Plain <code>```</code> text.\n</p>', '<p class="demo"><a href="#x">Link</a></p>'];
    expect(snippetBlocks(page)).toEqual(expected);
    for (const code of expected) expect(isDedentedSlice(demo, code, /^[ \t]*$/)).toBe(true);
    const report = await htmlValidate.validateString(page, join(fixture, "_site/components/atoms/demo.html"));
    expect(report.valid, JSON.stringify(report.results)).toBe(true);
    expect(result.pages.map((p) => p.path)).not.toContain("components/atoms/index.html");

    const index = out("components/index.md");
    const atoms = index.slice(index.indexOf("## Atoms"), index.indexOf("## Molecules"));
    expect(atoms).toContain("[Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.md)");
    expect(atoms).not.toContain("Coming in M2");
    expect(index.slice(index.indexOf("## Molecules"))).toContain("Coming in M2");
    expect(out("examples.md")).toContain("[Atoms · domestic-ui](https://odonckers.github.io/domestic-ui/examples/atoms/index.html)");

    const readme = read(join(fixture, "README.md"));
    expect(readme).toContain('| Atoms | Demo | `class="demo"` | [Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.html) |');
    expect(readme).not.toContain("| Atoms | Coming in M2 |");

    expect(read(join(fixture, "llms.txt"))).toContain("- [Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.md): A demo atom used by the docs discovery test.");
    const full = read(join(fixture, "llms-full.txt"));
    // The snippet contains ``` so its fence must be longer.
    expect(full).toContain(`\`\`\`\`html\n${expected[0]}\n\`\`\`\``);
    expect(htmlFences(full)).toEqual(expect.arrayContaining(expected));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
