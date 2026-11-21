#!/usr/bin/env node
// @ts-check
/*
 * Docs build. Zero dependencies.
 *
 *   node site/build.mjs           build _site/ and write README.md, llms.txt, llms-full.txt
 *   node site/build.mjs --check   exit 1 if README.md, llms.txt or llms-full.txt are stale
 *
 * Output is deterministic (sorted inputs, no timestamps) so --check can
 * compare bytes. See site/README.md for how sources map to pages.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadModel } from "./lib/discovery.mjs";
import { NAV, navEntryOf, navTree } from "./lib/nav.mjs";
import { generateLlms, generateLlmsFull, generateReadme, searchIndex } from "./lib/outputs.mjs";
import { buildPages } from "./lib/pages.mjs";
import { renderHtml, renderMarkdown } from "./lib/templates.mjs";

export { extractSnippets, loadModel } from "./lib/discovery.mjs";
export { markdownToHtml } from "./lib/markdown.mjs";
export { generateLlms, generateLlmsFull, generateReadme } from "./lib/outputs.mjs";
export { buildPages } from "./lib/pages.mjs";
export { NAV } from "./lib/nav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "..");
const ASSETS = join(HERE, "assets");

/** Files at the repository root that the build owns. */
export const GENERATED = /** @type {const} */ (["README.md", "llms.txt", "llms-full.txt"]);

/**
 * Titles must be unique per page (<title>, llms.txt). On a clash, the
 * sidebar entry is appended, e.g. "Grid (Layout)"; the sidebar link keeps
 * the short title.
 * @param {import("./lib/pages.mjs").Page[]} pages
 */
function dedupeTitles(pages) {
  const count = new Map();
  for (const p of pages) count.set(p.title, (count.get(p.title) ?? 0) + 1);
  return pages.map((p) => {
    if (count.get(p.title) === 1) return p;
    const section = navEntryOf(p)?.title ?? p.section;
    return { ...p, navLabel: p.navLabel ?? p.title, title: `${p.title} (${section})` };
  });
}

/**
 * Build everything in memory.
 * @param {string} [root] repository root (a fixture root in tests)
 */
export function generate(root = ROOT) {
  const model = loadModel(root);
  const pages = dedupeTitles(buildPages(model));
  for (const entry of NAV) if (!pages.some((p) => p.path === entry.path)) throw new Error(`The Docs sidebar entry "${entry.title}" links ${entry.path}, which no page builds`);
  const twins = new Set(pages.map((p) => p.path));
  const tree = navTree(pages, model.examples);
  return {
    model,
    pages,
    tree,
    files: {
      "README.md": generateReadme(model),
      "llms.txt": generateLlms(model, pages),
      "llms-full.txt": generateLlmsFull(model, pages, twins),
    },
    /** @param {import("./lib/pages.mjs").Page} page */
    html: (page) => renderHtml(page, tree),
    /** @param {import("./lib/pages.mjs").Page} page */
    markdown: (page) => renderMarkdown(page, twins),
  };
}

/**
 * Build the site into outDir (wiped first) and, unless writeRoot is false,
 * write the generated files at the root.
 * @param {{ root?: string, outDir?: string, writeRoot?: boolean }} [options]
 */
export function build({ root = ROOT, outDir, writeRoot = true } = {}) {
  const out = resolve(outDir ?? join(root, "_site"));
  if (out === resolve(root) || (resolve(root) + sep).startsWith(out + sep)) throw new Error(`Refusing to wipe ${out}: it contains the repository root`);
  const result = generate(root);

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  // Copied unchanged, so live examples and pages load the real CSS by relative path.
  cpSync(join(root, "css"), join(out, "css"), { recursive: true });
  cpSync(join(root, "examples"), join(out, "examples"), { recursive: true });
  cpSync(join(ASSETS, "site.css"), join(out, "site.css"));
  cpSync(join(ASSETS, "site.js"), join(out, "site.js"));
  // GitHub Pages: serve files as-is, no Jekyll processing.
  writeFileSync(join(out, ".nojekyll"), "");

  /** @type {Record<string, string>} */
  const html = {};
  for (const page of result.pages) {
    const file = join(out, page.path);
    mkdirSync(dirname(file), { recursive: true });
    html[page.path] = result.html(page);
    writeFileSync(file, html[page.path]);
    writeFileSync(file.replace(/\.html$/, ".md"), result.markdown(page));
  }
  writeFileSync(join(out, "search-index.json"), searchIndex(result.pages, html));
  for (const name of ["llms.txt", "llms-full.txt"]) writeFileSync(join(out, name), result.files[name]);
  if (writeRoot) for (const name of GENERATED) writeFileSync(join(root, name), result.files[name]);
  return result;
}

/**
 * Generated root files that differ from what is on disk.
 * @param {string} [root]
 */
export function stale(root = ROOT) {
  const { files } = generate(root);
  return GENERATED.filter((name) => !existsSync(join(root, name)) || readFileSync(join(root, name), "utf8") !== files[name]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes("--check")) {
    const files = stale();
    if (files.length) {
      for (const name of files) console.error(`${name} is stale; run node site/build.mjs`);
      process.exit(1);
    }
    console.log(`${GENERATED.join(", ")} are up to date.`);
  } else {
    const { pages } = build();
    console.log(`Built ${pages.length} pages into _site/ and wrote ${GENERATED.join(", ")}.`);
  }
}
