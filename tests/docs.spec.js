// @ts-check
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { HtmlValidate } from "html-validate";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { GENERATED, NAV, ROOT, build, extractSnippets, generate } from "../site/build.mjs";
import { parseTokenFile, resolveTokens, resolveValue } from "../site/lib/tokens.mjs";
import { linksOf, validateOtherSystems } from "../site/lib/other-systems.mjs";
import { DIAGRAM_DIR, checkDiagrams, diagramProblems, loadDiagrams } from "../site/lib/diagrams.mjs";
import { navLabel } from "../site/lib/nav.mjs";
import { escapeHtml, unescapeHtml } from "../site/lib/util.mjs";
import { SITE_DIR, WCAG_TAGS, builtPages, livePages, redirectPages, summarize } from "./docs-helpers.js";
import { blockExternalRequests, examples, schemes } from "./helpers.js";

/*
 * Docs site checks. tests/docs-helpers.js builds _site/ once; see there.
 * Mobile reflow and axe at 320 and 375 CSS pixels: tests/docs-mobile.spec.js.
 */
const site = generate();
const read = (/** @type {string} */ path) => readFileSync(path, "utf8");
const htmlValidate = new HtmlValidate(JSON.parse(read(join(ROOT, ".htmlvalidate.json"))));

/** Element and pattern pages: each has a header diagram (site/lib/diagrams.mjs). */
const diagramPages = site.pages.filter((p) => p.diagram);

/**
 * A minimal valid header diagram, for fixture pages.
 * @param {string} name the page's slug
 * @param {string} title "Where … is used"
 */
const fixtureDiagram = (name, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-labelledby="diagram-${name}-title" aria-describedby="diagram-${name}-desc">
  <title id="diagram-${name}-title">${title}</title>
  <desc id="diagram-${name}-desc">A fixture element in the content area.</desc>
  <rect x="92" y="40" width="100" height="20" rx="3" fill="var(--dui-color-accent-surface)" stroke="var(--dui-color-accent)" stroke-width="2"/>
</svg>
`;

/** The markup inside every <pre data-snippet><code>, unescaped. @param {string} html */
const snippetBlocks = (html) => [...html.matchAll(/<pre data-snippet="[^"]*"[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => unescapeHtml(m[1]));

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

  test("every element and pattern page has one valid header diagram under its lead; its twin has the description", () => {
    expect(diagramPages.map((p) => p.path)).not.toContain("components/base.html");
    for (const p of site.pages.filter((x) => /^(components\/(atoms|molecules|organisms|utilities)|layouts\/(?!index)|patterns\/(?!index))/.test(x.path))) expect(p.diagram, p.path).toBeTruthy();
    for (const p of diagramPages) {
      const d = site.model.diagrams.get(/** @type {string} */ (p.diagram));
      expect(d, p.path).toBeDefined();
      const html = site.html(p);
      expect(html.match(/<figure class="docs-diagram">/g), p.path).toHaveLength(1);
      const at = html.indexOf('<figure class="docs-diagram">');
      expect(at, `${p.path}: after the h1`).toBeGreaterThan(html.indexOf("<h1>"));
      expect(at, `${p.path}: before the first section`).toBeLessThan(html.indexOf("<h2 id="));
      const md = site.markdown(p);
      expect(md, p.path).toContain(`\n\n_Diagram: ${d?.desc}_\n\n`);
      expect(md, "no diagram markup in the twin").not.toContain("diagram-");
    }
    const full = read(join(ROOT, "llms-full.txt"));
    expect(full, "no diagram markup in llms-full.txt").not.toContain("aria-labelledby=\"diagram-");
    expect(full.match(/^_Diagram: .+_$/gm)).toHaveLength(diagramPages.length);
  });

  test("the build rejects a missing, orphan or invalid diagram with a clear message", () => {
    const tokens = new Set(["--dui-color-accent", "--dui-color-accent-surface", "--dui-color-border", "--dui-color-accent-hover"]);
    const good = fixtureDiagram("demo", "Where a demo is used");
    const problems = (/** @type {string} */ svg) => diagramProblems({ name: "demo", path: `${DIAGRAM_DIR}/demo.svg`, svg: svg.trim(), ...titleDesc(svg) }, ["Demo"], tokens);
    const titleDesc = (/** @type {string} */ svg) => ({ title: svg.match(/<title[^>]*>([^<]*)/)?.[1] ?? "", desc: svg.match(/<desc[^>]*>([^<]*)/)?.[1] ?? "" });
    expect(problems(good)).toEqual([]);
    expect(problems(good.replace('stroke="var(--dui-color-accent)"', 'stroke="var(--dui-color-accent-hover)"')), "site.css maps accent strokes by prefix").toEqual([]);
    const cases = /** @type {[string, string, RegExp][]} */ ([
      ["hex", good.replace('stroke="var(--dui-color-accent)"', 'stroke="#0055ff"'), /hex colour/],
      ["rgb", good.replace('fill="var(--dui-color-accent-surface)"', 'fill="rgb(0 0 255)"'), /colour function/],
      ["named", good.replace('fill="var(--dui-color-accent-surface)"', 'fill="blue"'), /fill="blue": use currentColor/],
      ["unknown token", good.replace("--dui-color-accent-surface", "--dui-color-nope"), /--dui-color-nope is not in css\/tokens\/semantic\.css/],
      ["viewBox", good.replace("0 0 320 180", "0 0 100 100"), /viewBox="0 0 320 180"/],
      ["width", good.replace('role="img"', 'width="320" role="img"'), /must not have width or height/],
      ["hidden", good.replace('role="img"', 'role="img" aria-hidden="true"'), /aria-hidden/],
      ["name with desc", good.replace('aria-labelledby="diagram-demo-title"', 'aria-labelledby="diagram-demo-title diagram-demo-desc"'), /aria-labelledby="diagram-demo-title" \(the title id alone; it is "diagram-demo-title diagram-demo-desc"\)/],
      ["no name", good.replace(' aria-labelledby="diagram-demo-title"', ""), /aria-labelledby="diagram-demo-title" \(the title id alone; it is missing\)/],
      ["no description", good.replace(' aria-describedby="diagram-demo-desc"', ""), /aria-describedby="diagram-demo-desc" \(the desc id; it is missing\)/],
      ["description not the desc", good.replace('aria-describedby="diagram-demo-desc"', 'aria-describedby="diagram-demo-title"'), /aria-describedby="diagram-demo-desc"/],
      ["title", good.replace("Where a demo is used", "A demo"), /<title> must be "Where … is used"/],
      ["desc", good.replace("A fixture element in the content area.", ""), /<desc> must be one sentence/],
      ["script", good.replace("</svg>", "<script>alert(1)</script></svg>"), /<script>/],
      ["style", good.replace("</svg>", "<style>rect{}</style></svg>"), /<style>/],
      ["xlink", good.replace("<rect", '<a xlink:href="https://example.com/"></a><rect'), /href/],
      ["two roots", `${good}${good}`, /exactly one root/],
      ["fill not in forced colours", good.replace('fill="var(--dui-color-accent-surface)"', 'fill="var(--dui-color-border)"'), /fill="var\(--dui-color-border\)": site\.css has no forced-colours rule for it; use one of currentColor, none, transparent/],
      ["stroke not in forced colours", good.replace('stroke="var(--dui-color-accent)"', 'stroke="transparent"'), /stroke="transparent": site\.css has no forced-colours rule for it/],
      ["no accent", good.replace(/var\(--dui-color-accent[a-z-]*\)/g, "currentColor"), /accent token/],
    ]);
    for (const [label, svg, message] of cases) expect(problems(svg).join("\n"), label).toMatch(message);

    // Missing and orphan files, through checkDiagrams() as build.mjs calls it.
    const pages = [{ path: "components/atoms/demo.html", heading: "Demo", diagram: "demo" }];
    const one = (/** @type {string} */ name, /** @type {string} */ svg) => new Map([[name, { name, path: `${DIAGRAM_DIR}/${name}.svg`, svg: svg.trim(), ...titleDesc(svg) }]]);
    expect(() => checkDiagrams(pages, one("demo", good), navLabel, ROOT)).not.toThrow();
    expect(() => checkDiagrams(pages, new Map(), navLabel, ROOT)).toThrow(`${DIAGRAM_DIR} is invalid (see site/README.md, "Diagrams"):\n  ${DIAGRAM_DIR}/demo.svg: missing; components/atoms/demo.html needs a diagram`);
    expect(() => checkDiagrams([], one("demo", good), navLabel, ROOT)).toThrow(`${DIAGRAM_DIR}/demo.svg: no element or pattern page is named demo`);
    // The real files: one per page, and every file is used.
    expect([...loadDiagrams(ROOT).keys()].sort()).toEqual(diagramPages.map((p) => p.diagram).sort());
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

  test("printed markup is the snippet text in examples/, byte for byte, on the page, its twin and in llms-full.txt", () => {
    const withSnippets = site.pages.filter((p) => p.snippets?.length);
    expect(withSnippets.length).toBeGreaterThan(0);
    const llmsFences = htmlFences(read(join(SITE_DIR, "llms-full.txt")));
    for (const page of withSnippets) {
      const snippets = page.snippets ?? [];
      const shown = snippetBlocks(read(join(SITE_DIR, page.path)));
      expect(shown, page.path).toEqual(snippets.map((s) => s.code));
      for (const s of snippets) {
        const source = read(join(ROOT, s.source));
        // The named marker is in the source, and the code is that region with one indentation removed.
        expect(source, `${s.source}: marker for "${s.name}"`).toMatch(new RegExp(`<!-- dui:snippet name="${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
        expect(isDedentedSlice(source, s.code, /^[ \t]*$/), `${page.path}: ${s.name} is not a slice of ${s.source}`).toBe(true);
        expect(llmsFences, `llms-full.txt has ${s.source}: ${s.name}`).toContain(s.code);
        expect(htmlFences(read(join(SITE_DIR, page.path.replace(/\.html$/, ".md")))), `${page.path} Markdown twin`).toContain(s.code);
      }
    }
  });

  test("markup exists once in examples/: every demo is a named snippet, no <pre> copies, every snippet on one page", () => {
    const pages = site.pages.flatMap((p) => p.snippets ?? []);
    for (const path of examples) {
      const html = read(join(ROOT, path));
      const markers = [...html.matchAll(/<!-- dui:snippet\b([^>]*)-->/g)];
      expect(markers.every((m) => /\bname="[^"]+"/.test(m[1])), `${path}: every snippet is named`).toBe(true);
      // A <pre> outside a snippet would be a copy of markup shown elsewhere.
      const outside = html.replace(/<!-- dui:snippet\b[\s\S]*?<!-- \/dui:snippet -->/g, "");
      expect(outside.match(/<pre\b/g) ?? [], `${path}: <pre> outside a snippet`).toEqual([]);
      // Showcases (examples/<group>/index.html) are fixtures only; every other example's snippets are each on one docs page.
      const own = site.model.snippets.filter((s) => s.source === path);
      expect(own.length, `${path}: snippets`).toBe(path.endsWith("/index.html") && path.split("/").length > 2 ? 0 : markers.length);
      for (const s of own) expect(pages.filter((x) => x === s).length, `${path}: ${s.name} is on one page`).toBe(1);
    }
    expect(pages.length).toBe(site.model.snippets.length);
  });

  test("every snippet is rendered live on exactly one page, its code directly below the render", async () => {
    /** @type {Map<string, { page: string, code: string }[]>} render page → frames that show it */
    const frames = new Map();
    for (const p of site.pages) {
      const html = read(join(SITE_DIR, p.path));
      for (const m of html.matchAll(/<iframe\b[^>]*\bsrc="([^"]+)"[^>]*><\/iframe>\n<pre data-snippet="[^"]*"[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)) {
        const target = posix.join(posix.dirname(p.path), unescapeHtml(m[1]));
        frames.set(target, [...(frames.get(target) ?? []), { page: p.path, code: unescapeHtml(m[2]) }]);
      }
      // Every frame on a docs page is a live example followed by its code.
      expect((html.match(/<iframe\b/g) ?? []).length, `${p.path}: frames`).toBe([...html.matchAll(/<\/iframe>\n<pre data-snippet=/g)].length);
    }
    const all = site.model.snippets;
    for (const s of all.filter((x) => !x.head)) {
      const on = frames.get(/** @type {string} */ (s.live)) ?? [];
      expect(on.map((f) => f.page), `${s.source}: ${s.name}`).toEqual([s.owner]);
      expect(on[0].code, `${s.source}: ${s.name}, code below its render`).toBe(s.code);
      // The render is the same text: the snippet is the render page's body, line for line.
      const render = read(join(SITE_DIR, /** @type {string} */ (s.live)));
      expect(render, `${s.live} renders the snippet text`).toContain(`  <body>\n${s.code}\n`);
      expect(render).toContain('<meta name="robots" content="noindex">');
      const report = await htmlValidate.validateString(render, s.live);
      expect(report.results.flatMap((r) => r.messages.map((m) => `${s.live}:${m.line}:${m.column} ${m.ruleId} ${m.message}`))).toEqual([]);
      for (const [, url] of render.matchAll(/<[a-z][^>]*?\s(?:href|src)="([^"#?][^"]*)"/g)) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
        expect(existsSync(join(SITE_DIR, posix.join(posix.dirname(/** @type {string} */ (s.live)), url.split("#")[0]))), `${s.live}: ${url}`).toBe(true);
      }
    }
    // A head snippet (a theme's <style>) is printed on one page and loaded by every render of its example.
    for (const s of all.filter((x) => x.head)) {
      const renders = all.filter((x) => x.source === s.source && x.live);
      expect(renders.length, `${s.source}: ${s.name} has renders`).toBeGreaterThan(0);
      for (const r of renders) {
        const render = read(join(SITE_DIR, /** @type {string} */ (r.live)));
        expect(isDedentedSlice(render.slice(0, render.indexOf("</head>")), s.code, /^[ \t]*$/), `${r.live} loads ${s.name}`).toBe(true);
      }
    }
    expect([...frames.keys()].sort(), "no frame without a snippet").toEqual(all.filter((s) => s.live).map((s) => s.live).sort());
    expect(livePages, "no render page without a snippet").toEqual([...frames.keys()].sort());
  });

  test("prose never repeats snippet markup", () => {
    // Any snippet line long enough to be markup rather than a word or a closing tag.
    const lines = [...new Set(site.model.snippets.flatMap((s) => s.code.split("\n").map((l) => l.trim())))].filter((l) => l.length >= 30 && /<[a-z]/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const page of site.pages) {
      const html = read(join(SITE_DIR, page.path));
      const main = html.slice(html.indexOf("<main"), html.indexOf("</main>")).replace(/<(pre|iframe)\b[\s\S]*?<\/\1>/g, "");
      const prose = unescapeHtml(main.replace(/<[^>]*>/g, ""));
      const md = read(join(SITE_DIR, page.path.replace(/\.html$/, ".md"))).replace(/^(`{3,})\w*\n[\s\S]*?\n\1$/gm, "");
      for (const line of lines) {
        expect(prose.includes(line), `${page.path} repeats ${line}`).toBe(false);
        expect(md.includes(line), `${page.path.replace(/\.html$/, ".md")} repeats ${line}`).toBe(false);
      }
    }
  });

  test("every old example URL is a static redirect to the page that now holds it", async () => {
    const old = ["examples.html", ...examples].sort();
    expect(redirectPages, "a redirect for each example page and examples.html").toEqual(old);
    const paths = site.pages.map((p) => p.path);
    for (const path of old) {
      const { to } = site.redirects[path];
      expect(paths, `${path} → ${to}`).toContain(to);
      const href = escapeHtml(posix.relative(posix.dirname(path), to));
      const html = read(join(SITE_DIR, path));
      expect(html, path).toContain(`<meta http-equiv="refresh" content="0; url=${href}">`);
      expect(html, path).toContain(`<link rel="canonical" href="https://odonckers.github.io/domestic-ui/${to}">`);
      expect(html, path).toContain('<meta name="robots" content="noindex">');
      expect(html, path).toMatch(/<title>Moved: [^<]+ · domestic-ui docs<\/title>/);
      expect(html, `${path}: a plain visible link`).toContain(`<a href="${href}">`);
      expect(html, `${path}: no docs content`).not.toContain("<main");
      const report = await htmlValidate.validateString(html, path);
      expect(report.results.flatMap((r) => r.messages.map((m) => `${path}:${m.line} ${m.ruleId} ${m.message}`))).toEqual([]);
      // The target shows the example's snippets (a showcase goes to its level index).
      const own = site.model.snippets.filter((s) => s.source === path);
      if (own.length) expect(own.some((s) => s.owner === to), `${path}: ${to} shows its snippets`).toBe(true);
    }
    expect(site.redirects["examples.html"].to).toBe("index.html");
    expect(site.redirects["examples/atoms/index.html"].to).toBe("atoms/index.html");
    expect(site.redirects["examples/molecules/index.html"].to).toBe("molecules/index.html");
    expect(site.redirects["examples/atoms/button.html"].to).toBe("components/atoms/button.html");
    expect(site.redirects["examples/molecules/tabs.html"].to).toBe("patterns/tabs.html");
    expect(site.redirects["examples/theming.html"].to).toBe("principles/theming.html");
    expect(read(join(SITE_DIR, "examples.md"))).toContain("](https://odonckers.github.io/domestic-ui/index.md)");
    // Nothing published links an old example URL any more.
    for (const name of GENERATED) expect(site.files[name], name).not.toMatch(/domestic-ui\/examples[./]/);
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
      ...order.flatMap((s) => {
        const links = linksOf(data.pages[key][s]);
        return links.length ? links.map((link) => `- [${data.systems[s].name}: ${link.title}](${link.url})`) : [`- ${data.systems[s].name}: No equivalent`];
      }),
    ].join("\n");

  test("every entry is the last section of its page, Markdown twin and llms-full.txt part, after the spec links", () => {
    const keys = Object.keys(data.pages);
    expect(keys.length).toBeGreaterThan(0);
    const full = read(join(SITE_DIR, "llms-full.txt"));
    for (const key of keys) {
      const html = read(join(SITE_DIR, `${key}.html`));
      // The page's own content: main's <article> (previous and next links follow it).
      const main = html.slice(html.indexOf("<main"), html.indexOf("</article>"));
      const headings = [...main.matchAll(/<h2 id="([^"]*)">/g)].map((m) => m[1]);
      expect(headings.at(-1), `${key}: last h2`).toBe("how-other-systems-do-it");
      expect(headings.filter((h) => h === "how-other-systems-do-it"), `${key}: once`).toHaveLength(1);
      // After the spec links ("Specifications") and after Keyboard.
      const specs = "specifications";
      expect(headings, `${key}: has spec links`).toContain(specs);
      expect(headings.indexOf("how-other-systems-do-it")).toBeGreaterThan(headings.indexOf(specs));
      if (headings.includes("keyboard")) expect(headings.indexOf("how-other-systems-do-it")).toBeGreaterThan(headings.indexOf("keyboard"));

      const section = main.slice(main.indexOf('<h2 id="how-other-systems-do-it">'));
      expect(section, key).toContain(`How other systems do it</h2>\n<p>${NOTE}</p>\n<ul>\n`);
      const items = [...section.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
      expect(items, key).toEqual(
        order.flatMap((s) => {
          const links = linksOf(data.pages[key][s]);
          const name = escapeHtml(data.systems[s].name);
          return links.length ? links.map((link) => `<a href="${escapeHtml(link.url)}">${name}: ${escapeHtml(link.title)}</a>`) : [`${name}: No equivalent`];
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
    for (const value of [{ url: "http://example.com/", title: "T" }, { url: "https://example.com/" }, { url: "https://example.com/", title: "T", note: "x" }, "https://example.com/", false, [], [{ url: "https://example.com/", title: "T" }, null]]) {
      expect(bad({ "patterns/tabs": { ...tabs, geist: value } }), JSON.stringify(value)).toEqual(['pages["patterns/tabs"].geist: must be null, { "url": "https://…", "title": "…" }, or a non-empty list of those']);
    }
    // A list of links is valid.
    expect(bad({ "patterns/tabs": { ...tabs, geist: [{ url: "https://example.com/a", title: "A" }, { url: "https://example.com/b", title: "B" }] } })).toEqual([]);
    expect(bad({}, { ...data.systems, carbon: { name: "Carbon" } })).toEqual(["systems.carbon: unknown system; expected one of apple, material, geist"]);

    // End to end, with the fixture approach below: a bad key fails the build with a clear message.
    const fixture = mkdtempSync(join(tmpdir(), "dui-docs-other-"));
    try {
      for (const path of ["PRINCIPLES.md", "css", "examples", "site/content", "site/data", DIAGRAM_DIR]) cpSync(join(ROOT, path), join(fixture, path), { recursive: true });
      const file = join(fixture, "site/data/other-systems.json");
      // A new atom with no entry builds, with a warning naming it.
      cpSync(join(ROOT, "css/components/atoms/badge.css"), join(fixture, "css/components/atoms/demo.css"));
      writeFileSync(join(fixture, DIAGRAM_DIR, "demo.svg"), fixtureDiagram("demo", "Where a demo is used"));
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
      expect(md, `${title}: API cell as written`).toContain(`\n\n${api}\n\n`);
      expect(md, `${title}: specs`).toMatch(/## Specifications\n\n- \[/);
      // Live example: one block per named snippet in the example, in order: name, render, code.
      const source = read(join(ROOT, exampleFile));
      const names = [...source.matchAll(/<!-- dui:snippet name="([^"]+)"/g)].map((m) => m[1]);
      expect(names.length, `${title}: snippets`).toBeGreaterThan(0);
      expect(page.snippets.map((/** @type {any} */ s) => s.name), title).toEqual(names);
      expect(snippetBlocks(html), title).toEqual(extractSnippets(source, exampleFile).map((s) => s.code));
      for (const s of page.snippets) {
        const name = s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(html).toMatch(new RegExp(`<h3 id="[^"]*">${name}</h3>\\n<iframe class="example-frame" data-live[^>]* src="../../${s.live}" title="Live example: ${name}"></iframe>\\n<pre data-snippet=`));
      }
    }
    const button = read(join(SITE_DIR, "components/atoms/button.md"));
    expect(button).not.toContain("# Buttons\n\nPlain <button>");
    // Labelled header blocks are h3s under Attributes; the Our choice bullets keep their label, with no heading.
    for (const h of ["## Attributes", "### States", "### Sizes", "### Focus"]) expect(button).toContain(`\n${h}\n`);
    expect(button).not.toContain("\n## Our choice\n");
    expect(button).toContain("| `aria-disabled=\"true\"` | Looks disabled");
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
    expect(read(join(SITE_DIR, "examples/atoms/index.html")), "the showcase redirects to the level index").toContain('url=../../atoms/index.html"');
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

  test("snippets are named marker regions only", () => {
    const page = (/** @type {string} */ head, /** @type {string} */ main) => `<!DOCTYPE html><html lang="en"><head><title>x</title>${head}</head><body><main>\n${main}\n</main></body></html>`;
    const region = '    <!-- dui:snippet name="Lead" -->\n    <p data-text="lead">A &amp; B</p>\n      <span>indented</span>\n    <!-- /dui:snippet -->';
    expect(extractSnippets(page("", `${region}\n<pre><code>&lt;hr&gt;</code></pre>`), "x.html")).toEqual([
      { name: "Lead", code: '<p data-text="lead">A &amp; B</p>\n  <span>indented</span>', source: "x.html", page: "", head: false },
    ]);
    // page="…" sends it to another docs page; a region in <head> is a head snippet.
    expect(extractSnippets(page('<!-- dui:snippet name="Theme" page="principles/theming" --><style>p {}</style><!-- /dui:snippet -->', ""), "x.html")).toEqual([
      { name: "Theme", code: "<style>p {}</style>", source: "x.html", page: "principles/theming", head: true },
    ]);
    // <pre> blocks and <main> are not snippets; an unnamed region is an error.
    expect(extractSnippets(page("", "<h2>Two</h2>\n<pre><code>&lt;hr&gt;</code></pre>"), "x.html")).toEqual([]);
    expect(() => extractSnippets(page("", "<!-- dui:snippet -->\n<p>x</p>\n<!-- /dui:snippet -->"), "x.html")).toThrow(/needs a name/);
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

  test("token tables are labelled by their heading, have column headers and sit in a named horizontal scroll region", () => {
    for (const f of files) {
      const html = read(join(SITE_DIR, `tokens/${f.replace(/\.css$/, ".html")}`));
      const tables = [...html.matchAll(/<h2 id="([^"]+)">[^<]*<\/h2>\n(?:<p>.*<\/p>\n)?<div data-scroll="inline" tabindex="0" role="region" aria-labelledby="([^"]+)">\n<table class="token-table" aria-labelledby="([^"]+)">/g)];
      expect(tables.length, f).toBe(html.split("<table").length - 1);
      for (const [, id, region, table] of tables) expect([region, table]).toEqual([id, id]);
      expect(html, "no caption repeats the heading").not.toContain("<caption>");
      expect(html).toContain('<th scope="col">Token</th><th scope="col">Preview</th><th scope="col">Light</th><th scope="col">Dark</th><th scope="col">Description</th>');
    expect(html).not.toMatch(/style="[^"]*var\(/);
      // Missing descriptions say so, never an empty cell.
      expect(html).not.toContain("<td></td>");
    }
    const primitives = read(join(SITE_DIR, "tokens/primitives.html"));
    expect(primitives).toContain('<span class="token-missing">No description yet</span>');
    const semantic = read(join(SITE_DIR, "tokens/semantic.html"));
    expect(semantic).toContain('<span class="token-chip" style="--preview: #12151b"></span>');
    expect(semantic).toMatch(/With <code>@media \(prefers-reduced-motion: reduce\)<\/code>: <code>var\(--dui-factor-0\)<\/code>, resolves to <code>0<\/code>\./);
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

  for (const path of livePages) {
    test(`render page ${path} has no axe violations and no external requests (light and dark)`, async ({ page, baseURL }) => {
      const external = await blockExternalRequests(page, baseURL ?? "");
      for (const colorScheme of schemes) {
        await page.emulateMedia({ colorScheme });
        await page.goto(`_site/${path}`, { waitUntil: "networkidle" });
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(violations, `${colorScheme}\n${summarize(violations)}`).toEqual([]);
      }
      expect(external, "external network requests").toEqual([]);
    });
  }

  test("every element and pattern page has one diagram between the h1 and the first h2, named and drawn with tokens", async ({ page }) => {
    for (const p of diagramPages) {
      const strokes = [];
      for (const colorScheme of /** @type {const} */ (["light", "dark"])) {
        await page.emulateMedia({ colorScheme });
        await page.goto(`_site/${p.path}`);
        const svg = page.locator("figure.docs-diagram > svg[role=img]");
        await expect(svg, p.path).toHaveCount(1);
        await expect(page.locator("main svg[role=img]"), `${p.path}: one diagram`).toHaveCount(1);
        const placed = await svg.evaluate((el) => {
          const h1 = document.querySelector("main h1");
          const h2 = document.querySelector("main h2");
          return Boolean(h1 && h2 && h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING && el.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
        expect(placed, `${p.path}: after the h1, before the first h2`).toBe(true);
        // SVG-AAM: aria-labelledby names it by its <title> alone ("Where … used"); aria-describedby describes it by its <desc> (one sentence).
        const title = (await svg.locator("title").textContent())?.trim() ?? "";
        const desc = (await svg.locator("desc").textContent())?.trim() ?? "";
        expect(title, p.path).toMatch(/^Where .+ used$/);
        expect(desc, p.path).toMatch(/^[A-Z].+\.$/);
        await expect(svg, p.path).toHaveAccessibleName(title);
        const described = await svg.evaluate((el) => document.getElementById(el.getAttribute("aria-describedby") ?? "")?.textContent?.trim());
        expect(described, `${p.path}: aria-describedby points at the <desc>`).toBe(desc);
        await expect(svg, p.path).toHaveAccessibleDescription(desc);
        await expect(svg).not.toHaveAttribute("aria-hidden", /.*/);
        // The accent is a token: its computed colour changes with the colour scheme.
        strokes.push(await svg.locator('g[stroke="var(--dui-color-accent)"]').first().evaluate((g) => getComputedStyle(g).stroke));
      }
      expect(strokes[0], `${p.path}: accent stroke resolves to a colour`).not.toMatch(/var\(|none/);
      expect(strokes[1], `${p.path}: accent stroke differs in dark mode`).not.toBe(strokes[0]);
    }
  });

  test("in forced colors a diagram draws its element in Highlight and the rest in CanvasText on Canvas", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("_site/components/atoms/button.html");
    const colors = await page.locator("figure.docs-diagram > svg").evaluate((svg) => {
      // Each system colour as the browser resolves it, from a probe element.
      const system = (/** @type {string} */ name) => {
        const probe = document.body.appendChild(document.createElement("span"));
        probe.style.color = name;
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      const style = (/** @type {string} */ selector) => {
        const el = svg.querySelector(selector);
        if (!el) throw new Error(`No ${selector} in the diagram`);
        const s = getComputedStyle(el);
        return { fill: s.fill, stroke: s.stroke, fillOpacity: s.fillOpacity };
      };
      return {
        system: { Canvas: system("Canvas"), CanvasText: system("CanvasText"), Highlight: system("Highlight"), HighlightText: system("HighlightText") },
        frame: style('rect[fill="var(--dui-color-surface)"][stroke="var(--dui-color-border)"]'),
        line: style('g[stroke="currentColor"] > *'),
        textBar: style('g[fill="currentColor"] > rect'),
        accent: style('g[stroke="var(--dui-color-accent)"] > rect'),
        solid: style('rect[fill="var(--dui-color-accent)"]'),
        tint: style('g[fill="var(--dui-color-accent-surface)"] > rect:not([fill])'),
        onSolid: style('g[fill="var(--dui-color-accent)"] > rect[fill="var(--dui-color-surface)"]'),
      };
    });
    const { system } = colors;
    // HighlightText may equal Canvas (it does in Chromium's emulation); the other pairs must differ.
    expect(new Set([system.Canvas, system.CanvasText, system.Highlight]).size, "Canvas, CanvasText and Highlight differ").toBe(3);
    expect(system.HighlightText, "HighlightText differs from Highlight").not.toBe(system.Highlight);
    expect(colors.frame).toMatchObject({ fill: system.Canvas, stroke: system.CanvasText });
    expect(colors.line.stroke, "region lines").toBe(system.CanvasText);
    expect(colors.textBar, "text bars stay visible: CanvasText, fully opaque").toMatchObject({ fill: system.CanvasText, fillOpacity: "1" });
    expect(colors.accent.stroke, "the element's outline").toBe(system.Highlight);
    expect(colors.accent.stroke, "the element differs from the muted shapes").not.toBe(colors.line.stroke);
    expect(colors.solid.fill, "the element's solid fill").toBe(system.Highlight);
    expect(colors.tint.fill, "the element's tint").toBe(system.Canvas);
    expect(colors.onSolid.fill, "text bars on the solid fill").toBe(system.HighlightText);
  });

  test("redirect pages have no axe violations, refresh at once and land on their page", async ({ page }) => {
    // Each target page loads its live frames eagerly, so budget time per redirect, not per test.
    test.setTimeout(30_000 + redirectPages.length * 5_000);
    for (const path of redirectPages) {
      const { to } = site.redirects[path];
      // Answer the target with 204 No Content, so the browser stays on the redirect page for axe (meta-refresh rule included).
      const target = (/** @type {URL} */ url) => url.pathname.endsWith(`/_site/${to}`);
      await page.route(target, (route) => route.fulfill({ status: 204 }));
      await page.goto(`_site/${path}`);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(violations, `${path}\n${summarize(violations)}`).toEqual([]);
      await page.unroute(target);
      await page.goto(`_site/${path}`);
      // Live frames load with the page (not lazily), so wait for the document, not every frame.
      await page.waitForURL(`**/_site/${to}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1"), `${path} → ${to}`).toHaveCount(1);
    }
  });

  test("interactive snippets work in their frames on the docs page", async ({ page }) => {
    // Every web component in a snippet is defined in its render page.
    for (const s of site.model.snippets.filter((x) => /<dui-[a-z]/.test(x.code))) {
      await page.goto(`_site/${s.live}`);
      for (const tag of new Set([...s.code.matchAll(/<(dui-[a-z-]+)/g)].map((m) => m[1]))) {
        await expect.poll(() => page.evaluate((t) => Boolean(customElements.get(t)), tag), `${s.live}: ${tag}`).toBe(true);
      }
    }
    await page.goto("_site/patterns/tabs.html");
    const tabsFrame = page.locator('iframe[title="Live example: Automatic activation"]');
    const tabs = tabsFrame.contentFrame();
    await tabs.getByRole("tab", { name: "Security" }).click();
    await expect(tabs.getByRole("tabpanel", { name: "Security" })).toBeVisible();
    // site.js fits the frame to its content.
    await expect
      .poll(() => tabsFrame.evaluate((f) => Math.abs(f.getBoundingClientRect().height - (/** @type {HTMLIFrameElement} */ (f).contentDocument?.documentElement.getBoundingClientRect().height ?? 0)) <= 3))
      .toBe(true);

    await page.goto("_site/patterns/dialog.html");
    const dialog = page.locator('iframe[title="Live example: Modal dialog"]').contentFrame();
    await dialog.getByRole("button", { name: "Delete project…" }).click();
    await expect(dialog.getByRole("dialog", { name: "Delete project?" })).toBeVisible();

    await page.goto("_site/patterns/menu-button.html");
    const menu = page.locator('iframe[title="Live example: Actions menu"]').contentFrame();
    await menu.getByRole("button", { name: "Actions" }).click();
    await expect(menu.getByRole("menu")).toBeVisible();
  });

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

  test("the Docs sidebar marks the current page once and opens only its group; the app bar and breadcrumb agree", async ({ page }) => {
    for (const p of site.pages) {
      await page.goto(`_site/${p.path}`);
      const nav = page.locator('nav[aria-label="Docs"]');
      await expect(nav, p.path).toHaveCount(1);
      await expect(nav, p.path).toHaveAttribute("data-nav", "vertical");
      const current = nav.locator('a[aria-current="page"]');
      await expect(current, p.path).toHaveCount(1);
      expect(await current.evaluate((a) => /** @type {HTMLAnchorElement} */ (a).href), p.path).toBe(page.url());
      await expect(nav.locator("[aria-current]"), `${p.path}: no other aria-current in the sidebar`).toHaveCount(1);
      // Only the group that holds the current page is open (in the markup: correct without JavaScript).
      const groups = await nav.locator("details").evaluateAll((all) => all.map((d) => ({ open: /** @type {HTMLDetailsElement} */ (d).open, here: !!d.querySelector('[aria-current="page"]') })));
      for (const g of groups) expect(g.open, p.path).toBe(g.here);
      // Its summary is drawn differently (nav.css: bold).
      if (groups.some((g) => g.here)) {
        const [here, other] = await nav.evaluate((n) =>
          [n.querySelector("details:has([aria-current]) > summary"), n.querySelector("details:not(:has([aria-current])) > summary")].map((s) => (s ? getComputedStyle(s).fontWeight : "")),
        );
        expect(here, p.path).not.toBe(other);
      }
      // App bar: one current section.
      await expect(page.locator('nav[aria-label="Sections"] a[aria-current]'), p.path).toHaveCount(1);
      // Breadcrumb: the last item is the page.
      const crumbs = page.locator('nav[aria-label="Breadcrumb"]');
      if (p.path === "index.html") await expect(crumbs).toHaveCount(0);
      else {
        await expect(crumbs.locator("li").last().locator('a[aria-current="page"]'), p.path).toHaveCount(1);
        await expect(crumbs.locator('a[aria-current="page"]'), p.path).toHaveCount(1);
      }
      await expect(page.locator('[role="menu"], [role="menubar"], [role="menuitem"]'), p.path).toHaveCount(0);
    }
  });

  test("the Docs sidebar lists every entry in order and reaches every page; previous and next follow it", async ({ page }) => {
    await page.goto("_site/index.html");
    const top = await page.locator('nav[aria-label="Docs"] > ul > li > a, nav[aria-label="Docs"] > ul > li > details > summary').allTextContents();
    expect(top).toEqual([
      "Getting started",
      "Principles",
      "Tokens",
      "Base",
      "Layout",
      "Atoms",
      "Molecules",
      "Organisms",
      "Patterns",
      "Guides",
      "Demos",
      "Contributing",
      "Changelog",
    ]);
    expect(top).toEqual(NAV.map((n) => n.title));
    const linked = await page.locator('nav[aria-label="Docs"] a').evaluateAll((all) => all.map((a) => new URL(/** @type {HTMLAnchorElement} */ (a).href).pathname.replace(/^\/_site\//, "")));
    for (const p of builtPages) expect(linked, `${p} is in the sidebar`).toContain(p);
    expect(new Set(linked).size, "each page once").toBe(linked.length);
    // No examples section: example pages are redirects and render pages are frames, never sidebar links.
    expect(linked.filter((p) => /^(?:examples|live)[/.]/.test(p)), "no example or render page links").toEqual([]);
    await expect(page.locator('nav[aria-label="Docs"]')).not.toContainText(/example/i);
    // Next links walk the sidebar order from the first page to the last.
    const walked = ["index.html"];
    for (let i = 0; i < linked.length; i++) {
      const next = page.locator('nav[aria-label="Previous and next"] a[rel="next"]');
      if (!(await next.count())) break;
      await expect(next).toHaveText(/^Next: /);
      await next.click();
      walked.push(new URL(page.url()).pathname.replace(/^\/_site\//, ""));
    }
    expect(walked).toEqual(linked);
    await expect(page.locator('nav[aria-label="Previous and next"] a[rel="prev"]')).toHaveText(/^Previous: /);
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

  test("without JavaScript the Docs sidebar stacks above main with only the current group open, and the token filter is hidden", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto("_site/tokens/semantic.html");
    const nav = page.locator('nav[aria-label="Docs"]');
    await expect(page.getByRole("button", { name: "Menu" }), "no button that does nothing").toBeHidden();
    await expect(nav.locator("details[open]")).toHaveCount(1);
    await expect(nav.locator('a[aria-current="page"]')).toBeVisible();
    const navBox = await nav.boundingBox();
    const mainBox = await page.locator("main").boundingBox();
    expect(navBox && mainBox && navBox.y + navBox.height <= mainBox.y, "sidebar above main").toBe(true);
    await expect(page.locator("[data-token-filter]")).toBeHidden();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await context.close();
  });
});

test("discovery picks up a new component with no site changes", async ({ browserName }) => {
  test.skip(browserName !== "chromium", "browser-independent; run once");
  const fixture = mkdtempSync(join(tmpdir(), "dui-docs-"));
  try {
    for (const path of ["PRINCIPLES.md", "css", "examples", "site/content", DIAGRAM_DIR]) cpSync(join(ROOT, path), join(fixture, path), { recursive: true });
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
      <!-- dui:snippet name="Plain" -->
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
    put(`${DIAGRAM_DIR}/demo.svg`, fixtureDiagram("demo", "Where a demo is used"));
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
      <!-- dui:snippet name="Fixture tabs" -->
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
    put(`${DIAGRAM_DIR}/demo-layout.svg`, fixtureDiagram("demo-layout", "Where a demo layout is used"));

    const result = build({ root: fixture });
    const out = (/** @type {string} */ path) => read(join(fixture, "_site", path));

    const page = out("components/atoms/demo.html");
    expect(page).toContain("<h1>Demo</h1>");
    expect(page, "the new page's diagram is inlined").toContain('aria-labelledby="diagram-demo-title" aria-describedby="diagram-demo-desc"');
    expect(page).toContain('src="../../live/atoms/demo--plain.html"');
    expect(page).toContain('src="../../live/atoms/demo--with-a-link.html"');
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
    expect(page).toMatch(/<details open>\s*<summary>Atoms<\/summary>[\s\S]*aria-current="page">Demo<\/a>/);
    const molecules = out("molecules/index.md");
    expect(molecules).toContain("[Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.md): Sections of content shown one at a time, chosen from a list of tabs. Available.");
    expect(molecules).toContain("Coming in M3.");
    expect(page, "an available pattern has no status note in the sidebar").toContain('<a href="../../patterns/tabs.html">Tabs</a>');
    expect(page).toContain('<a href="../../patterns/disclosure.html">Disclosure <span class="docs-nav-note">(coming in M3)</span></a>');
    // The fixture has no demos/, CONTRIBUTING.md or CHANGELOG.md: the pages still exist and say so.
    expect(out("demos.md")).toContain("Coming in M5.");
    expect(out("examples/atoms/index.html"), "the showcase redirects to the level index").toContain('url=../../atoms/index.html"');
    expect(out("examples/atoms/demo.html")).toContain('url=../../components/atoms/demo.html"');

    // The tabs pattern page is filled in: demo, byte-identical markup, keyboard notes from the CSS.
    const paths = result.pages.map((p) => p.path);
    expect(paths, "a pattern owns its file names").not.toContain("components/molecules/tabs.html");
    const tabsPage = out("patterns/tabs.html");
    expect(tabsPage).not.toContain("Coming in M3.");
    expect(tabsPage).toContain('src="../live/molecules/tabs--fixture-tabs.html"');
    const tabsCode = ['<div class="tabs">\n  <p>Fixture tabs.</p>\n</div>'];
    expect(out("live/molecules/tabs--fixture-tabs.html"), "the render page is the same text").toContain(`\n${tabsCode[0]}\n`);
    expect(snippetBlocks(tabsPage)).toEqual(tabsCode);
    expect(result.pages.find((p) => p.path === "patterns/tabs.html")?.snippets?.map((s) => s.code)).toEqual(tabsCode);
    expect(isDedentedSlice(tabs, tabsCode[0], /^[ \t]*$/)).toBe(true);
    expect(htmlFences(out("patterns/tabs.md"))).toEqual(tabsCode);
    expect(tabsPage).toContain('<th scope="row"><kbd>Left Arrow</kbd> / <kbd>Right Arrow</kbd></th><td>moves focus between tabs (fixture)</td>');
    expect(tabsPage).toContain('<th scope="row"><kbd>Home</kbd></th><td>moves focus to the first tab (fixture)</td>');
    expect(tabsPage, "the CSS Keyboard block wins over the registry list").not.toContain("moves focus into the tab list");
    expect(tabsPage).toContain('<a href="https://www.w3.org/WAI/ARIA/apg/patterns/tabs/">APG Tabs pattern</a>');
    const tabsReport = await htmlValidate.validateString(tabsPage, join(fixture, "_site/patterns/tabs.html"));
    expect(tabsReport.valid, JSON.stringify(tabsReport.results)).toBe(true);
    // Grouped by level, as in the sidebar.
    const patternsIndex = out("patterns/index.md");
    expect(patternsIndex).toContain("| [Tabs](https://odonckers.github.io/domestic-ui/patterns/tabs.md) | Available |");
    expect(patternsIndex.indexOf("## Molecules")).toBeLessThan(patternsIndex.indexOf("[Tabs]"));
    expect(patternsIndex).not.toMatch(/^## M3/m);
    const guide = out("guides/simple-site-to-erp-app.md");
    expect(guide).toContain("chosen from a list of tabs. Available.");
    expect(guide).not.toContain("Tabs (M3)");
    expect(guide).toContain("Not available yet: Disclosure (M3), Dialog and drawer (M3),");

    // The layout lands under Layouts, from css/layouts/ with its example in examples/layouts/.
    const layoutPage = out("layouts/demo-layout.html");
    expect(layoutPage).toContain('src="../live/layouts/demo-layout--plain.html"');
    expect(layoutPage).toMatch(/<details open>\s*<summary>Layout<\/summary>[\s\S]*aria-current="page">Demo layout<\/a>/);
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
