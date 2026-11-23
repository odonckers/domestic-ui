// @ts-check
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, build } from "../site/build.mjs";

/*
 * Shared by the docs specs. The site is built once into _site/ (without
 * touching README.md or llms*.txt, so the stale check stays meaningful) by
 * the process that collects tests; workers only read it. Building in every
 * worker would wipe _site/ while other workers load pages from it. ES
 * modules are evaluated once per process, so importing this from several
 * spec files still builds once. Playwright's webServer serves the repo
 * root, so pages are at /_site/….
 */
if (!process.env.TEST_WORKER_INDEX || !existsSync(join(ROOT, "_site", "index.html"))) build({ writeRoot: false });

export const SITE_DIR = join(ROOT, "_site");

/** The same tags as tests/a11y.spec.js. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Readable summary of axe violations for the failure message. @param {any[]} violations */
export const summarize = (violations) =>
  violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((/** @type {any} */ n) => n.target.join(" ")).join("\n    ")}`).join("\n");

/** Every .html file in _site/, as a path relative to _site/, sorted. */
const allHtml = readdirSync(SITE_DIR, { recursive: true })
  .map((name) => String(name).split("\\").join("/"))
  .filter((name) => name.endsWith(".html"))
  .sort();

/** Redirect pages at old example URLs (examples.html, examples/**): a meta refresh, no docs content. */
export const redirectPages = allHtml.filter((name) => name === "examples.html" || name.startsWith("examples/"));

/** Render pages: one per snippet, framed on its docs page (live/…). */
export const livePages = allHtml.filter((name) => name.startsWith("live/"));

/** The published plain HTML demo (demos/vanilla/, copied as-is; demos/a11y checks it). */
export const demoPages = allHtml.filter((name) => name.startsWith("demos/"));

/** Every built docs page: each .html file in _site/ that is not a redirect, a render page, the demo or under css/ or web-components/. */
export const builtPages = allHtml.filter((name) => !redirectPages.includes(name) && !livePages.includes(name) && !demoPages.includes(name) && !/^(?:css|web-components)\//.test(name));
