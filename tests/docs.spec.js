// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { HtmlValidate } from "html-validate";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { GENERATED, ROOT, build, extractSnippets, generate } from "../site/build.mjs";
import { SECTIONS } from "../site/lib/pages.mjs";
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
        if (s.from === "pre") {
          // Rule (b): the example's own <pre><code> content, unescaped, byte for byte.
          const main = source.slice(source.indexOf("<main"), source.lastIndexOf("</main>"));
          const examplePre = [...main.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => unescapeHtml(m[1]));
          expect(examplePre, `${page.path}: ${s.name} is a <pre><code> of ${s.source}`).toContain(s.code);
        } else {
          const decoration = s.from === "css-comment" ? /^\s*\*?\s*$/ : /^[ \t]*$/;
          expect(isDedentedSlice(source, s.code, decoration), `${page.path}: snippet is not a slice of ${s.source}`).toBe(true);
        }
        expect(llmsFences, `llms-full.txt has the ${s.source} snippet`).toContain(s.code);
        expect(htmlFences(read(join(SITE_DIR, page.path.replace(/\.html$/, ".md")))), `${page.path} Markdown twin`).toContain(s.code);
      }
    }
  });
});

test.describe("atoms from the group README", () => {
  test.beforeEach(({ browserName }) => test.skip(browserName !== "chromium", "browser-independent; run once"));

  // Read the index table here, independently of the build's parser.
  const readme = read(join(ROOT, "css/components/atoms/README.md"));
  const table = readme.slice(readme.indexOf("## Index"), readme.indexOf("\n## ", readme.indexOf("## Index") + 1));
  const rows = table
    .split("\n")
    .filter((l) => l.startsWith("| ") && !l.startsWith("| Atom ") && !l.startsWith("| ---"))
    .map((l) => l.slice(2, -2).split(/ (?<!\\)\| /).map((c) => c.replace(/\\\|/g, "|")));

  test("every row of the index table has a complete page, in row order", () => {
    expect(rows.length).toBeGreaterThan(0);
    const atomPages = site.pages.filter((p) => p.path.startsWith("components/atoms/"));
    expect(atomPages.slice(0, rows.length).map((p) => p.title)).toEqual(rows.map((r) => r[0]));
    for (const [title, , api, example] of rows) {
      const exampleFile = example.match(/\]\(([^)]+)\)/)?.[1].replace(/^(\.\.\/)+/, "") ?? "";
      const page = /** @type {any} */ (atomPages.find((p) => p.title === title));
      const html = read(join(SITE_DIR, page.path));
      const md = read(join(SITE_DIR, page.path.replace(/\.html$/, ".md")));
      expect(page.path, title).toBe(`components/atoms/${exampleFile.replace(/^.*\//, "")}`);
      expect(html, `${title}: live example`).toContain(`src="../../${exampleFile}"`);
      expect(md, `${title}: API cell as written`).toContain(`\n\n${api}\n\n`);
      expect(md, `${title}: specs`).toMatch(/## Specs\n\n- \*\*/);
      // Copy-paste markup: one named block per <pre><code> in the example, byte for byte.
      const source = read(join(ROOT, exampleFile));
      const pre = [...source.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => unescapeHtml(m[1]));
      expect(snippetBlocks(html), title).toEqual(pre);
      expect(page.snippets.every((/** @type {any} */ s) => s.from === "pre" && s.name), `${title}: every snippet is named`).toBe(true);
      for (const s of page.snippets) expect(html).toMatch(new RegExp(`<h3 id="[^"]*">${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h3>\\n<pre data-snippet=`));
    }
    const button = read(join(SITE_DIR, "components/atoms/button.md"));
    expect(button).not.toContain("# Buttons\n\nPlain <button>");
    for (const h of ["## States", "## Sizes", "## Focus", "## Our choice"]) expect(button).toContain(`\n${h}\n`);
    expect(button).toContain("- **Our choice:** small buttons are 32px tall");
    const controls = read(join(SITE_DIR, "components/atoms/controls.md"));
    expect(controls).toContain("[`css/base/forms.css`](https://github.com/odonckers/domestic-ui/blob/main/css/base/forms.css) (base layer; no CSS file of its own)");
  });

  test("the components index has the API convention, every Our choice and the Not shipped table", () => {
    const index = read(join(SITE_DIR, "components/index.md"));
    expect(index).toContain("## Component API\n\nEach component exposes one `data-<component>` attribute.");
    expect(index).toMatch(/\*\*Our choice:\*\* One attribute is one API to learn/);
    const atoms = index.slice(index.indexOf("\n## Atoms\n"), index.indexOf("\n## Molecules\n"));
    const choices = [...readme.matchAll(/^- \*\*Our choice:\*\*/gm)].length;
    expect([...atoms.matchAll(/^- \*\*Our choice:\*\*/gm)].length).toBe(choices);
    expect(atoms).toContain("### Not shipped, and why\n\n| Candidate | Decision |");
    expect(read(join(SITE_DIR, "examples.md"))).toContain("[Atoms showcase](https://odonckers.github.io/domestic-ui/examples/atoms/index.html)");
    expect(site.pages.some((p) => p.path === "components/atoms/index.html"), "the showcase is not a component").toBe(false);
    for (const name of ["README.md", "llms.txt", "llms-full.txt"]) expect(site.files[name], name).toContain('`data-button="primary small"`');
    expect(site.files["llms-full.txt"]).toMatch(/\n## Component API\n\n[\s\S]*\n## Components\n\nPage: /);
  });

  test("demo apps are listed from demos/ with the first line of their README", () => {
    const names = readdirSync(join(ROOT, "demos"), { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(ROOT, "demos", e.name, "README.md")));
    expect(names.length).toBeGreaterThan(0);
    for (const { name } of names) {
      const first = read(join(ROOT, "demos", name, "README.md")).split("\n")[0].replace(/^#+\s*/, "");
      const line = `- [\`demos/${name}/\`](https://github.com/odonckers/domestic-ui/tree/main/demos/${name}): ${first}`;
      expect(site.files["README.md"]).toContain(line);
      expect(read(join(SITE_DIR, "index.md"))).toContain(line);
    }
    expect(existsSync(join(SITE_DIR, "demos")), "demos are not copied into _site/").toBe(false);
  });

  test("snippet rules apply in priority order", () => {
    const page = (/** @type {string} */ main) => `<!DOCTYPE html><html lang="en"><body><main>\n${main}\n</main></body></html>`;
    const pre = '<h2>One &amp; two</h2>\n<pre><code>&lt;p data-text="lead"&gt;A &amp;amp; B&lt;/p&gt;</code></pre>\n<h3>Three</h3><pre><code>&lt;hr&gt;</code></pre>';
    expect(extractSnippets(page(pre), "x.html")).toEqual([
      { name: "One & two", code: '<p data-text="lead">A &amp; B</p>', source: "x.html", from: "pre" },
      { name: "Three", code: "<hr>", source: "x.html", from: "pre" },
    ]);
    expect(extractSnippets(page(`<!-- dui:snippet -->\n<p>x</p>\n<!-- /dui:snippet -->\n${pre}`), "x.html").map((s) => s.from)).toEqual(["snippet"]);
    expect(extractSnippets(page("  <p>only</p>"), "x.html")).toEqual([{ name: "", code: "<p>only</p>", source: "x.html", from: "main" }]);
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
    for (const path of ["index.html", site.pages.find((p) => p.section === "atoms" && p.snippets?.length)?.path ?? "components/index.html"]) {
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
      if (SECTIONS.some((s) => s.path === p.path)) {
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

    // Before its files land, the tabs pattern page is a short "coming" page.
    const before = generate(fixture);
    const tabsBefore = before.pages.find((p) => p.path === "patterns/tabs.html");
    expect(tabsBefore).toBeDefined();
    const tabsBeforeMd = before.markdown(/** @type {any} */ (tabsBefore));
    expect(tabsBeforeMd).toContain("\n\nComing in M3.\n\n");
    expect(tabsBeforeMd).toContain("[APG Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)");
    for (const absent of ["## Live example", "## Markup", "## Keyboard", "```"]) expect(tabsBeforeMd).not.toContain(absent);
    expect(tabsBefore?.snippets ?? []).toEqual([]);
    expect(before.files["llms.txt"]).toContain("- Tabs: Coming in M3.");

    // Then a molecule CSS file (with a Keyboard block) and its example page fill it in.
    put(
      "css/components/molecules/tabs.css",
      `/*
 * Molecule: tabs
 *
 * Tabs for the docs discovery test, following the APG Tabs pattern.
 *
 * API
 *   class="tabs"
 *
 * Keyboard
 *   Left Arrow / Right Arrow: moves focus between tabs (fixture)
 *   Home  moves focus to the first tab (fixture)
 *
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
.tabs {
  display: block;
}
`,
    );
    const tabs = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Tabs · domestic-ui</title>
    <link rel="stylesheet" href="../../css/domestic.css">
  </head>
  <body>
    <main>
      <h1>Tabs</h1>
      <!-- dui:snippet -->
      <div class="tabs">
        <p>Fixture tabs.</p>
      </div>
      <!-- /dui:snippet -->
    </main>
  </body>
</html>
`;
    put("examples/molecules/tabs.html", tabs);

    // A layout primitive in css/layouts/ (plural) with an example in examples/layouts/.
    put(
      "css/layouts/demo-layout.css",
      `/*
 * Layout: .demo-layout
 *
 * A demo layout used by the docs discovery test.
 *
 * API
 *   class="demo-layout"
 */
.demo-layout {
  display: grid;
}
`,
    );
    put("examples/layouts/demo-layout.html", demo.replace("Demo · domestic-ui", "Demo layout · domestic-ui"));

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
    expect(atoms).not.toMatch(/coming in M2/i);
    // demo.css is not in the README index table: it still gets a page, after the table's rows.
    const atomPaths = result.pages.filter((p) => p.path.startsWith("components/atoms/")).map((p) => p.path);
    expect(atomPaths[atomPaths.length - 1]).toBe("components/atoms/demo.html");
    expect(out("atoms/index.md")).toContain("[Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.md)");
    const molecules = index.slice(index.indexOf("## Molecules"), index.indexOf("## Organisms"));
    expect(molecules).toContain("[Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.md): Sections of content shown one at a time, chosen from a list of tabs. Available.");
    expect(molecules).toContain("Coming in M3.");
    expect(out("examples.md")).toContain("[Atoms showcase](https://odonckers.github.io/domestic-ui/examples/atoms/index.html)");

    // The tabs pattern page is filled in: demo, byte-identical markup, keyboard notes from the CSS.
    const paths = result.pages.map((p) => p.path);
    expect(paths, "a pattern owns its file names").not.toContain("components/molecules/tabs.html");
    const tabsPage = out("patterns/tabs.html");
    expect(tabsPage).not.toContain("Coming in M3.");
    expect(tabsPage).toContain('src="../examples/molecules/tabs.html"');
    const tabsCode = ['<div class="tabs">\n  <p>Fixture tabs.</p>\n</div>'];
    expect(snippetBlocks(tabsPage)).toEqual(tabsCode);
    expect(result.pages.find((p) => p.path === "patterns/tabs.html")?.snippets?.map((s) => s.code)).toEqual(tabsCode);
    expect(isDedentedSlice(tabs, tabsCode[0], /^[ \t]*$/)).toBe(true);
    expect(htmlFences(out("patterns/tabs.md"))).toEqual(tabsCode);
    expect(tabsPage).toContain("From the <code>Keyboard</code> block in");
    expect(tabsPage).toContain('<th scope="row"><kbd>Left Arrow</kbd> / <kbd>Right Arrow</kbd></th><td>moves focus between tabs (fixture)</td>');
    expect(tabsPage).toContain('<th scope="row"><kbd>Home</kbd></th><td>moves focus to the first tab (fixture)</td>');
    expect(tabsPage, "the CSS Keyboard block wins over the registry list").not.toContain("moves focus into the tab list");
    expect(tabsPage).toContain('<a href="https://www.w3.org/WAI/ARIA/apg/patterns/tabs/">APG Tabs pattern</a>');
    const tabsReport = await htmlValidate.validateString(tabsPage, join(fixture, "_site/patterns/tabs.html"));
    expect(tabsReport.valid, JSON.stringify(tabsReport.results)).toBe(true);
    expect(out("patterns/index.md")).toContain("| [Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.md) | molecule | Available |");
    const guide = out("guides/simple-site-to-erp-app.md");
    expect(guide).toContain("chosen from a list of tabs. Available.");
    expect(guide).not.toContain("Tabs (M3)");
    expect(guide).toContain("Not available yet: Disclosure (M3), Dialog and drawer (M3),");

    // The layout lands under Layouts, from css/layouts/ with its example in examples/layouts/.
    const layoutPage = out("layouts/demo-layout.html");
    expect(layoutPage).toContain('src="../examples/layouts/demo-layout.html"');
    expect(layoutPage).toMatch(/<nav class="section-nav" aria-label="Layouts">[\s\S]*aria-current="page">Demo layout<\/a>/);
    expect(out("layouts/index.md")).toContain("- [Demo layout](https://odonckers.github.io/domestic-ui/layouts/demo-layout.md): A demo layout used by the docs discovery test.");
    expect(index.slice(index.indexOf("## Layouts"))).toContain("[Demo layout](https://odonckers.github.io/domestic-ui/layouts/demo-layout.md)");

    const readme = read(join(fixture, "README.md"));
    expect(readme).toContain('| Atoms | Demo | `class="demo"` | [Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.html) |');
    expect(readme).not.toContain("| Atoms | Coming in M2 |");
    expect(readme).toContain('| Molecules | Tabs | `class="tabs"` | [Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.html) |');
    expect(readme).toContain("| [Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.html) | M3 | Available |");
    expect(readme).toContain('| Layouts | Demo layout | `class="demo-layout"` | [Demo layout](https://odonckers.github.io/domestic-ui/layouts/demo-layout.html) |');

    const llms = read(join(fixture, "llms.txt"));
    expect(llms).toContain("- [Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.md): A demo atom used by the docs discovery test.");
    expect(llms).toContain("- [Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.md): Available.");
    expect(llms).not.toContain("- Tabs: Coming in M3.");
    expect(llms.slice(llms.indexOf("## Layouts"), llms.indexOf("## Patterns"))).toContain("- [Demo layout](https://odonckers.github.io/domestic-ui/layouts/demo-layout.md)");
    const full = read(join(fixture, "llms-full.txt"));
    // The snippet contains ``` so its fence must be longer.
    expect(full).toContain(`\`\`\`\`html\n${expected[0]}\n\`\`\`\``);
    expect(htmlFences(full)).toEqual(expect.arrayContaining([...expected, ...tabsCode]));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
