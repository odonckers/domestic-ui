// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { HtmlValidate } from "html-validate";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { GENERATED, NAV, ROOT, build, extractSnippets, generate } from "../site/build.mjs";
import { parseTokenFile, resolveTokens, resolveValue } from "../site/lib/tokens.mjs";
import { validateOtherSystems } from "../site/lib/other-systems.mjs";
import { escapeHtml, unescapeHtml } from "../site/lib/util.mjs";
import { SITE_DIR, WCAG_TAGS, builtPages, summarize } from "./docs-helpers.js";
import { blockExternalRequests, schemes } from "./helpers.js";

/*
 * Docs site checks. tests/docs-helpers.js builds _site/ once; see there.
 * Mobile reflow and axe at 320 and 375 CSS pixels: tests/docs-mobile.spec.js.
 */
const site = generate();
const read = (/** @type {string} */ path) => readFileSync(path, "utf8");
const htmlValidate = new HtmlValidate(JSON.parse(read(join(ROOT, ".htmlvalidate.json"))));

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
          const examplePre = [...main.matchAll(/<pre\b[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => unescapeHtml(m[1]));
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

test.describe("how other systems do it", () => {
  test.beforeEach(({ browserName }) => test.skip(browserName !== "chromium", "browser-independent; run once"));

  // Read the data here, independently of the build's renderer.
  const data = JSON.parse(read(join(ROOT, "site/data/other-systems.json")));
  const order = ["apple", "material", "geist"];
  const NOTE = "For comparison only; these are not the standard this system follows.";
  /** The expected Markdown section for one key, with its heading at `hashes`. @param {string} key @param {string} hashes */
  const expectedMd = (key, hashes) =>
    [
      `${hashes} How other systems do it`,
      "",
      NOTE,
      "",
      ...order.map((s) => {
        const link = data.pages[key][s];
        return link ? `- [${data.systems[s].name}: ${link.title}](${link.url})` : `- ${data.systems[s].name}: No equivalent`;
      }),
    ].join("\n");

  test("every entry is the last section of its page, Markdown twin and llms-full.txt part, after the spec links", () => {
    const keys = Object.keys(data.pages);
    expect(keys.length).toBeGreaterThan(0);
    const full = read(join(SITE_DIR, "llms-full.txt"));
    for (const key of keys) {
      const html = read(join(SITE_DIR, `${key}.html`));
      const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
      const headings = [...main.matchAll(/<h2 id="([^"]*)">/g)].map((m) => m[1]);
      expect(headings.at(-1), `${key}: last h2`).toBe("how-other-systems-do-it");
      expect(headings.filter((h) => h === "how-other-systems-do-it"), `${key}: once`).toHaveLength(1);
      // After the spec links: "Specs" on built pages, "Standard" on planned pattern pages; and after Keyboard.
      const specs = headings.includes("specs") ? "specs" : "standard";
      expect(headings, `${key}: has spec links`).toContain(specs);
      expect(headings.indexOf("how-other-systems-do-it")).toBeGreaterThan(headings.indexOf(specs));
      if (headings.includes("keyboard")) expect(headings.indexOf("how-other-systems-do-it")).toBeGreaterThan(headings.indexOf("keyboard"));

      const section = main.slice(main.indexOf('<h2 id="how-other-systems-do-it">'));
      expect(section, key).toContain(`How other systems do it</h2>\n<p>${NOTE}</p>\n<ul>\n`);
      const items = [...section.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
      expect(items, key).toEqual(
        order.map((s) => {
          const link = data.pages[key][s];
          const name = escapeHtml(data.systems[s].name);
          return link ? `<a href="${escapeHtml(link.url)}">${name}: ${escapeHtml(link.title)}</a>` : `${name}: No equivalent`;
        }),
      );
      expect(section, `${key}: plain links`).not.toContain("target=");

      const md = read(join(SITE_DIR, `${key}.md`));
      expect(md.endsWith(`\n\n${expectedMd(key, "##")}\n`), `${key}.md ends with the section`).toBe(true);

      const start = full.indexOf(`\nPage: https://odonckers.github.io/domestic-ui/${key}.html\n`);
      expect(start, `${key} in llms-full.txt`).toBeGreaterThan(0);
      const next = full.indexOf("\nPage: ", start + 1);
      const part = full.slice(start, next < 0 ? undefined : full.lastIndexOf("\n## ", next));
      expect(part.trimEnd().endsWith(`\n\n${expectedMd(key, "###")}`), `${key}: llms-full.txt part ends with the section`).toBe(true);
    }
    expect(site.files["llms.txt"]).not.toContain("How other systems do it");
    expect(site.files["README.md"]).toContain("for comparison only");
    for (const name of Object.values(data.systems).map((s) => /** @type {any} */ (s).name)) expect(site.files["README.md"]).not.toContain(name);
  });

  test("pages with no entry get no section", () => {
    const keys = new Set(Object.keys(data.pages));
    for (const page of site.pages.filter((p) => !keys.has(p.path.replace(/\.html$/, "")))) {
      expect(read(join(SITE_DIR, page.path)), page.path).not.toContain("How other systems do it");
    }
    expect(site.warnings, "every comparable page has an entry").toEqual([]);
  });

  test("the build rejects invalid data and warns about comparable pages with no entry", () => {
    const paths = site.pages.map((p) => p.path);
    expect(validateOtherSystems(data, paths)).toEqual([]);
    const tabs = data.pages["patterns/tabs"];
    const bad = (/** @type {any} */ pages, systems = data.systems) => validateOtherSystems({ systems, pages }, paths);
    expect(bad({ "patterns/nope": tabs })).toEqual(['pages["patterns/nope"]: no built page patterns/nope.html']);
    expect(bad({ "patterns/tabs": { ...tabs, carbon: null } })).toEqual(['pages["patterns/tabs"].carbon: unknown system; expected one of apple, material, geist']);
    expect(bad({ "patterns/tabs": { apple: null, material: null } })).toEqual(['pages["patterns/tabs"]: missing "geist" (use null for no equivalent)']);
    for (const value of [{ url: "http://example.com/", title: "T" }, { url: "https://example.com/" }, { url: "https://example.com/", title: "T", note: "x" }, "https://example.com/", false]) {
      expect(bad({ "patterns/tabs": { ...tabs, geist: value } }), JSON.stringify(value)).toEqual(['pages["patterns/tabs"].geist: must be null or { "url": "https://…", "title": "…" }']);
    }
    expect(bad({}, { ...data.systems, carbon: { name: "Carbon" } })).toEqual(["systems.carbon: unknown system; expected one of apple, material, geist"]);

    // End to end, with the fixture approach below: a bad key fails the build with a clear message.
    const fixture = mkdtempSync(join(tmpdir(), "dui-docs-other-"));
    try {
      for (const path of ["PRINCIPLES.md", "css", "examples", "site/content", "site/data"]) cpSync(join(ROOT, path), join(fixture, path), { recursive: true });
      const file = join(fixture, "site/data/other-systems.json");
      // A new atom with no entry builds, with a warning naming it.
      cpSync(join(ROOT, "css/components/atoms/badge.css"), join(fixture, "css/components/atoms/demo.css"));
      const warned = generate(fixture);
      expect(warned.warnings).toEqual([`site/data/other-systems.json has no entry for: components/atoms/demo. Add one (null for no equivalent) to list how other systems do it.`]);
      expect(warned.pages.find((p) => p.path === "components/atoms/demo.html")?.blocks.some((b) => b.md.includes("How other systems do it"))).toBe(false);

      writeFileSync(file, JSON.stringify({ ...data, pages: { ...data.pages, "patterns/nope": tabs } }));
      expect(() => generate(fixture)).toThrow('site/data/other-systems.json is invalid:\n  pages["patterns/nope"]: no built page patterns/nope.html');
      writeFileSync(file, "{");
      expect(() => generate(fixture)).toThrow(/site\/data\/other-systems\.json: not valid JSON/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
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
      const pre = [...source.matchAll(/<pre\b[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => unescapeHtml(m[1]));
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

  test("Getting started has the API convention; the atoms index has every Our choice and the Not shipped table", () => {
    const home = read(join(SITE_DIR, "index.md"));
    expect(home).toContain("## Component API\n\nEach component exposes one `data-<component>` attribute.");
    expect(home).toMatch(/\*\*Our choice:\*\* One attribute is one API to learn/);
    const atoms = read(join(SITE_DIR, "atoms/index.md"));
    const choices = [...readme.matchAll(/^- \*\*Our choice:\*\*/gm)].length;
    expect([...atoms.matchAll(/^- \*\*Our choice:\*\*/gm)].length).toBe(choices);
    expect(atoms).toContain("## Not shipped, and why\n\n| Candidate | Decision |");
    expect(read(join(SITE_DIR, "examples.md"))).toContain("[Atoms showcase](https://odonckers.github.io/domestic-ui/examples/atoms/index.html)");
    expect(site.pages.some((p) => p.path === "components/atoms/index.html"), "the showcase is not a component").toBe(false);
    expect(site.pages.some((p) => p.path === "components/index.html"), "the all-levels overview is gone; its parts live on Getting started and the level indexes").toBe(false);
    for (const name of ["README.md", "llms.txt", "llms-full.txt"]) expect(site.files[name], name).toContain('`data-button="primary small"`');
    expect(site.files["llms-full.txt"]).toContain("\n### Component API\n\nEach component exposes one `data-<component>` attribute.");
  });

  test("demos.html lists demos/ by name with the first sentence of each README", () => {
    const names = readdirSync(join(ROOT, "demos"), { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(ROOT, "demos", e.name, "README.md")));
    expect(names.length).toBeGreaterThan(0);
    const demos = read(join(SITE_DIR, "demos.md"));
    for (const { name } of names) {
      const text = read(join(ROOT, "demos", name, "README.md"));
      const h1 = text.split("\n")[0].replace(/^#\s*/, "").replace(/^domestic-ui demos?:\s*/i, "");
      // The first paragraph after the H1, up to its first sentence end.
      const para = text.split(/\n\s*\n/)[1].replace(/\s*\n\s*/g, " ");
      const sentence = para.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? para;
      const start = `- **${h1.charAt(0).toUpperCase()}${h1.slice(1)}** ([\`demos/${name}/\`](https://github.com/odonckers/domestic-ui/tree/main/demos/${name})): `;
      expect(demos).toContain(start);
      expect(site.files["README.md"]).toContain(start);
      // Relative links in the sentence point at GitHub or the site, so compare the text up to the first link.
      expect(demos.slice(demos.indexOf(start) + start.length).split("\n")[0].split("](")[0]).toBe(sentence.split("](")[0]);
    }
    expect(existsSync(join(SITE_DIR, "demos")), "demos are not copied into _site/").toBe(false);
  });

  test("Contributing and Changelog are rendered read-only from the repository files", () => {
    for (const [page, file] of [["contributing", "CONTRIBUTING.md"], ["changelog", "CHANGELOG.md"]]) {
      const md = read(join(SITE_DIR, `${page}.md`));
      const source = read(join(ROOT, file));
      expect(md).toContain(`# ${source.match(/^#\s+(.+)$/m)?.[1]}`);
      expect(md).toContain(`[edit ${file} on GitHub](https://github.com/odonckers/domestic-ui/edit/main/${file})`);
      for (const [, heading] of source.matchAll(/^##+\s+(.+)$/gm)) expect(md, `${file}: ${heading}`).toContain(heading);
      // No relative links left: each points at a site page or GitHub.
      expect(md).not.toMatch(/\]\((?![a-z]+:|#)[^)]*\)/);
    }
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

test.describe("tokens from css/tokens/", () => {
  test.beforeEach(({ browserName }) => test.skip(browserName !== "chromium", "browser-independent; run once"));

  const files = readdirSync(join(ROOT, "css/tokens")).filter((f) => f.endsWith(".css")).sort();

  test("every custom property in every token file has exactly one row, with light and dark values", () => {
    expect(files.length).toBeGreaterThan(1);
    const llmsFull = site.files["llms-full.txt"];
    for (const f of files) {
      const css = read(join(ROOT, "css/tokens", f));
      const names = [...new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))];
      expect(names.length, f).toBeGreaterThan(0);
      const page = f.replace(/\.css$/, "");
      const html = read(join(SITE_DIR, `tokens/${page}.html`));
      const md = read(join(SITE_DIR, `tokens/${page}.md`));
      for (const name of names) {
        expect(html.split(`<th scope="row"><code>${name}</code></th>`).length - 1, `${f}: ${name} row`).toBe(1);
        expect(md, `${f}: ${name} in the Markdown twin`).toMatch(new RegExp(`^\\| \`${name}\` \\| \`[^\`]+\` \\| \`[^\`]+\` \\| \\S`, "m"));
        expect(llmsFull, `${name} in llms-full.txt`).toContain(`| \`${name}\` |`);
      }
      expect(site.files["llms.txt"]).toContain(`(https://odonckers.github.io/domestic-ui/tokens/${page}.md)`);
    }
    expect(site.pages.map((p) => p.path).filter((p) => p.startsWith("tokens/"))).toEqual(["tokens/index.html", ...files.map((f) => `tokens/${f.replace(/\.css$/, ".html")}`)]);
    expect(existsSync(join(SITE_DIR, "tokens/space.html")), "the old per-group pages are gone").toBe(false);
  });

  test("values resolve through var() and light-dark(), and descriptions come from comments", () => {
    const values = new Map([
      ["--a", "#fff"],
      ["--b", "#000"],
      ["--c", "light-dark(var(--a), var(--b))"],
      ["--d", "color-mix(in oklab, var(--c) 10%, var(--a))"],
      ["--loop", "var(--loop)"],
    ]);
    expect(resolveValue("var(--c)", "light", values)).toBe("#fff");
    expect(resolveValue("var(--c)", "dark", values)).toBe("#000");
    expect(resolveValue("var(--d)", "dark", values)).toBe("color-mix(in oklab, #000 10%, #fff)");
    expect(resolveValue("var(--nope, var(--a))", "light", values)).toBe("#fff");
    expect(resolveValue("var(--nope)", "light", values)).toBe("var(--nope)");
    expect(resolveValue("var(--loop)", "light", values, ["--loop"])).toBe("var(--loop)");

    const [file] = resolveTokens([
      parseTokenFile(
        `/*
 * Example tokens (internal).
 *
 * Intro line.
 */

/* 1. First: the section comment. */
:root,
::backdrop {
  /* Group A */
  --x-one: 1rem; /* Trailing description */
  /* Above, after a declaration */
  --x-two: var(--x-one);

  /* Group B */
  /* Above, under the group heading */
  --x-three: light-dark(red, blue);
  --x-four: 2px;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --x-two: 0s;
  }
}
`,
        "css/tokens/example.css",
      ),
    ]);
    expect([file.title, file.tier, file.intro, file.sitePath]).toEqual(["Example tokens", "internal", "Intro line.", "tokens/example.html"]);
    expect(file.groups.map((g) => g.name)).toEqual(["Group A", "Group B"]);
    const tokens = Object.fromEntries(file.groups.flatMap((g) => g.tokens).map((t) => [t.name, t]));
    expect(tokens["--x-one"].description).toBe("Trailing description");
    expect(tokens["--x-two"].description).toBe("Above, after a declaration");
    expect(tokens["--x-two"].light).toBe("1rem");
    expect(tokens["--x-two"].conditions).toEqual([{ condition: "@media (prefers-reduced-motion: reduce)", value: "0s", light: "0s", dark: "0s" }]);
    expect(tokens["--x-three"].description).toBe("Above, under the group heading");
    expect([tokens["--x-three"].light, tokens["--x-three"].dark]).toEqual(["red", "blue"]);
    expect(tokens["--x-four"].description).toBe("");
  });

  test("token tables have a caption, column headers and a named horizontal scroll region", () => {
    for (const f of files) {
      const html = read(join(SITE_DIR, `tokens/${f.replace(/\.css$/, ".html")}`));
      const tables = [...html.matchAll(/<div data-scroll="inline" tabindex="0" role="region" aria-label="([^"]+)">\n<table class="token-table">\n<caption>([^<]+)<\/caption>/g)];
      expect(tables.length, f).toBe(html.split("<table").length - 1);
      for (const [, label, caption] of tables) expect(label).toBe(`${caption} (scrolls horizontally)`);
      expect(html).toContain('<th scope="col">Token</th><th scope="col">Written as</th><th scope="col">Light</th><th scope="col">Dark</th><th scope="col">Description</th><th scope="col">Preview</th>');
      expect(html).not.toMatch(/style="[^"]*var\(/);
      // Missing descriptions say so, never an empty cell.
      expect(html).not.toContain("<td></td>");
    }
    const primitives = read(join(SITE_DIR, "tokens/primitives.html"));
    expect(primitives).toContain('<span class="token-missing">No description yet</span>');
    const semantic = read(join(SITE_DIR, "tokens/semantic.html"));
    expect(semantic).toContain('<span class="token-chip" style="--preview: #12151b"></span>');
    expect(semantic).toMatch(/With <code>@media \(prefers-reduced-motion: reduce\)<\/code>: <code>var\(--dui-duration-0\)<\/code>, resolves to <code>0s<\/code>\./);
    expect(read(join(SITE_DIR, "tokens/index.md"))).toMatch(/Primitive.*Internal, may change in any release/);
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

  test("the skip link is the first focusable element and moves focus to main", async ({ page }) => {
    for (const path of ["index.html", site.pages.find((p) => p.section === "atoms" && p.snippets?.length)?.path ?? "atoms/index.html"]) {
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

  test("one Docs sidebar marks the current page once and its entry visibly", async ({ page }) => {
    for (const p of site.pages) {
      await page.goto(`_site/${p.path}`);
      await expect(page.locator("nav"), `${p.path}: one navigation`).toHaveCount(1);
      await expect(page.locator('nav[aria-label="Docs"]'), p.path).toHaveCount(1);
      const current = page.locator('a[aria-current="page"]');
      await expect(current, p.path).toHaveCount(1);
      expect(await current.evaluate((a) => /** @type {HTMLAnchorElement} */ (a).href), p.path).toBe(page.url());
      await expect(page.locator("[aria-current]"), `${p.path}: no other aria-current`).toHaveCount(1);
      // The entry that holds the current page is marked, and drawn differently from the others.
      const entry = page.locator("li[data-current-section]");
      await expect(entry, p.path).toHaveCount(1);
      await expect(entry.locator('a[aria-current="page"]'), p.path).toHaveCount(1);
      const [marked, other] = await page.evaluate(() =>
        [document.querySelector("li[data-current-section]"), document.querySelector('nav[aria-label="Docs"] > ul > li:not([data-current-section])')].map(
          (li) => (li ? getComputedStyle(li).backgroundColor + getComputedStyle(li).borderInlineStartStyle : ""),
        ),
      );
      expect(marked, p.path).not.toBe(other);
    }
  });

  test("the Docs sidebar lists every entry in order and reaches every page", async ({ page }) => {
    await page.goto("_site/index.html");
    const top = await page.locator('nav[aria-label="Docs"] > ul > li > a').allTextContents();
    expect(top).toEqual([
      "Getting started",
      "Principles",
      "Tokens",
      "Base",
      "Layout",
      "Atoms",
      "Molecules",
      "Organisms",
      "Patterns and guides",
      "Demos",
      "Contributing",
      "Changelog",
    ]);
    expect(top).toEqual(NAV.map((n) => n.title));
    const linked = await page.locator('nav[aria-label="Docs"] a').evaluateAll((all) => all.map((a) => new URL(/** @type {HTMLAnchorElement} */ (a).href).pathname.replace(/^\/_site\//, "")));
    for (const p of builtPages) expect(linked, `${p} is in the sidebar`).toContain(p);
  });

  test("the token filter hides rows and groups that do not match and says how many are shown", async ({ page }) => {
    await page.goto("_site/tokens/semantic.html");
    const input = page.getByRole("searchbox", { name: "Filter tokens" });
    await expect(input).toBeVisible();
    const total = await page.locator("tbody tr").count();
    await input.fill("surface-raised");
    await expect(page.getByRole("status")).toHaveText("1 token shown");
    await expect(page.locator("tbody tr:visible")).toHaveCount(1);
    await expect(page.locator("[data-token-group]:visible")).toHaveCount(1);
    // Matches values and descriptions too.
    await input.fill("#3451d1");
    await expect(page.locator("tbody tr:visible").first()).toContainText("--dui-color-accent");
    await input.fill("");
    await expect(page.getByRole("status")).toHaveText(`${total} tokens shown`);
    await expect(page.locator("tbody tr:visible")).toHaveCount(total);
  });

  test("without JavaScript the Docs menu is open and the token filter is hidden", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto("_site/tokens/semantic.html");
    await expect(page.locator("details.docs-menu")).toHaveAttribute("open", "");
    await expect(page.locator('nav[aria-label="Docs"] a[aria-current="page"]')).toBeVisible();
    await expect(page.locator("[data-token-filter]")).toBeHidden();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await context.close();
  });
});

test("discovery picks up a new component with no site changes", async ({ browserName }) => {
  test.skip(browserName !== "chromium", "browser-independent; run once");
  const fixture = mkdtempSync(join(tmpdir(), "dui-docs-"));
  try {
    for (const path of ["PRINCIPLES.md", "css", "examples", "site/content"]) cpSync(join(ROOT, path), join(fixture, path), { recursive: true });
    // The fixture starts before any molecule exists (M3 "coming"); the test adds its own tabs files below.
    for (const path of ["css/components/molecules", "examples/molecules"]) rmSync(join(fixture, path), { recursive: true, force: true });
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

    const atoms = out("atoms/index.md");
    expect(atoms).toContain("[Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.md)");
    expect(atoms).not.toMatch(/coming in M2/i);
    // demo.css is not in the README index table: it still gets a page, after the table's rows.
    const atomPaths = result.pages.filter((p) => p.path.startsWith("components/atoms/")).map((p) => p.path);
    expect(atomPaths[atomPaths.length - 1]).toBe("components/atoms/demo.html");
    expect(page).toMatch(/<li data-current-section><a href="..\/..\/atoms\/index.html">Atoms<\/a>[\s\S]*aria-current="page">Demo<\/a>/);
    const molecules = out("molecules/index.md");
    expect(molecules).toContain("[Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.md): Sections of content shown one at a time, chosen from a list of tabs. Available.");
    expect(molecules).toContain("Coming in M3.");
    expect(page, "an available pattern has no status note in the sidebar").toContain('<a href="../../patterns/tabs.html">Tabs</a>');
    expect(page).toContain('<a href="../../patterns/disclosure.html">Disclosure <span class="docs-nav-note">(coming in M3)</span></a>');
    // The fixture has no demos/, CONTRIBUTING.md or CHANGELOG.md: the pages still exist and say so.
    expect(out("demos.md")).toContain("Coming in M5.");
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
    expect(layoutPage).toMatch(/<li data-current-section><a href="index.html">Layout<\/a>[\s\S]*aria-current="page">Demo layout<\/a>/);
    expect(out("layouts/index.md")).toContain("- [Demo layout](https://odonckers.github.io/domestic-ui/layouts/demo-layout.md): A demo layout used by the docs discovery test.");

    const readme = read(join(fixture, "README.md"));
    expect(readme).toContain('| Atoms | Demo | `class="demo"` | [Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.html) |');
    expect(readme).not.toContain("| Atoms | Coming in M2 |");
    expect(readme).toContain('| Molecules | Tabs | `class="tabs"` | [Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.html) |');
    expect(readme).toContain("| [Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.html) | M3 | Available |");
    expect(readme).toContain('| Layout | Demo layout | `class="demo-layout"` | [Demo layout](https://odonckers.github.io/domestic-ui/layouts/demo-layout.html) |');

    const llms = read(join(fixture, "llms.txt"));
    expect(llms).toContain("- [Demo](https://odonckers.github.io/domestic-ui/components/atoms/demo.md): A demo atom used by the docs discovery test.");
    expect(llms).toContain("- [Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.md): Available.");
    expect(llms).not.toContain("- Tabs: Coming in M3.");
    expect(llms.slice(llms.indexOf("## Layout\n"), llms.indexOf("## Atoms\n"))).toContain("- [Demo layout](https://odonckers.github.io/domestic-ui/layouts/demo-layout.md)");
    const full = read(join(fixture, "llms-full.txt"));
    // The snippet contains ``` so its fence must be longer.
    expect(full).toContain(`\`\`\`\`html\n${expected[0]}\n\`\`\`\``);
    expect(htmlFences(full)).toEqual(expect.arrayContaining([...expected, ...tabsCode]));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
