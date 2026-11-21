// @ts-check
/*
 * Header diagrams: site/assets/diagrams/<slug>.svg, one per element and
 * pattern page, inlined under the page's lead (site/README.md, "Diagrams").
 *
 * The build fails when a reference page has no diagram, a diagram has no
 * page, or a file breaks the rules below: one root <svg> with
 * viewBox="0 0 320 180" and no width or height, role="img" labelled by its
 * <title> ("Where … is used") and described by its <desc> (one sentence),
 * and colours only as currentColor, none, transparent or a semantic
 * var(--dui-…) token. No scripts, styles, classes or links, so the file
 * is safe to inline.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { byString, unescapeHtml } from "./util.mjs";

/** Where the files are, relative to the repository root. */
export const DIAGRAM_DIR = "site/assets/diagrams";

export const VIEWBOX = "0 0 320 180";

/** Over this many bytes a diagram is no longer small and hand-readable. */
const MAX_BYTES = 3072;

/** Attributes that take a colour. */
const COLOR_ATTRS = ["fill", "stroke", "color", "stop-color", "flood-color", "lighting-color"];

/**
 * The fill and stroke values site.css maps in forced colours ("Diagrams" in
 * site/README.md); anything else would keep its token colour there. Strokes
 * also take var(--dui-color-accent-…), which site.css matches by prefix.
 */
const FORCED = {
  fill: ["currentColor", "none", "transparent", "var(--dui-color-surface)", "var(--dui-color-accent-surface)", "var(--dui-color-accent)", "var(--dui-color-backdrop)"],
  stroke: ["currentColor", "none", "var(--dui-color-border)", "var(--dui-color-accent)"],
};

/** Markup that must not be inlined into a docs page. */
const FORBIDDEN = [
  [/<script\b/i, "<script>"],
  [/<style\b/i, "<style>"],
  [/<foreignObject\b/i, "<foreignObject>"],
  [/<image\b/i, "<image>"],
  [/<use\b/i, "<use>"],
  [/\b(?:xlink:)?href\s*=/i, "an href (no external references)"],
  [/\burl\(/i, "url()"],
  [/\sstyle\s*=/i, "a style attribute (use fill and stroke attributes)"],
  [/\sclass\s*=/i, "a class attribute"],
  [/\son[a-z]+\s*=/i, "an event handler attribute"],
  [/#[0-9a-f]{3,8}\b/i, "a hex colour"],
  [/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i, "a colour function (use a var(--dui-…) token)"],
];

/**
 * @typedef {object} Diagram
 * @property {string} name   the file name without .svg: the page's slug
 * @property {string} path   repo-relative path
 * @property {string} svg    the file's text, trimmed
 * @property {string} title  plain text of <title>
 * @property {string} desc   plain text of <desc>
 */

/** The diagram name of a page: the last segment of its path without .html. @param {string} sitePath */
export const diagramName = (sitePath) => sitePath.split("/").pop()?.replace(/\.html$/, "") ?? "";

/**
 * Read every diagram file. Never throws for content; see checkDiagrams().
 * @param {string} root
 * @returns {Map<string, Diagram>}
 */
export function loadDiagrams(root) {
  const dir = join(root, DIAGRAM_DIR);
  /** @type {Map<string, Diagram>} */
  const diagrams = new Map();
  if (!existsSync(dir)) return diagrams;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".svg")).sort(byString)) {
    const svg = readFileSync(join(dir, file), "utf8").trim();
    const text = (/** @type {string} */ tag) => unescapeHtml(svg.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "").replace(/\s+/g, " ").trim();
    diagrams.set(file.slice(0, -4), { name: file.slice(0, -4), path: `${DIAGRAM_DIR}/${file}`, svg, title: text("title"), desc: text("desc") });
  }
  return diagrams;
}

/**
 * Problems with one diagram file.
 * @param {Diagram} d
 * @param {string[]} names the page's names, for the title: its heading and sidebar label
 * @param {Set<string>} tokens semantic token names (css/tokens/semantic.css)
 */
export function diagramProblems(d, names, tokens) {
  const problems = [];
  const { svg } = d;
  const root = svg.match(/^<svg\b([^>]*)>/);
  if (!root || !svg.endsWith("</svg>") || (svg.match(/<svg\b/g) ?? []).length !== 1) problems.push("must be exactly one root <svg>…</svg>, with nothing before or after it");
  const attrs = root?.[1] ?? "";
  const attr = (/** @type {string} */ name) => attrs.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  if (attr("viewBox") !== VIEWBOX) problems.push(`the root svg needs viewBox="${VIEWBOX}"`);
  if (attr("width") !== undefined || attr("height") !== undefined) problems.push("the root svg must not have width or height (viewBox only; site.css sizes it)");
  if (attr("role") !== "img") problems.push('the root svg needs role="img"');
  if (/\saria-hidden=/.test(attrs)) problems.push("must not be aria-hidden");
  const ids = { title: `diagram-${d.name}-title`, desc: `diagram-${d.name}-desc` };
  // SVG-AAM: the name is the <title> alone, the description the <desc> (https://www.w3.org/TR/svg-aam-1.0/#mapping_additional_nd).
  const labelledby = attr("aria-labelledby");
  if (labelledby !== ids.title) problems.push(`the root svg needs aria-labelledby="${ids.title}" (the title id alone; it is ${labelledby === undefined ? "missing" : `"${labelledby}"`})`);
  const describedby = attr("aria-describedby");
  if (describedby !== ids.desc) problems.push(`the root svg needs aria-describedby="${ids.desc}" (the desc id; it is ${describedby === undefined ? "missing" : `"${describedby}"`})`);
  if (!new RegExp(`<title id="${ids.title}">`).test(svg)) problems.push(`needs <title id="${ids.title}">`);
  if (!new RegExp(`<desc id="${ids.desc}">`).test(svg)) problems.push(`needs <desc id="${ids.desc}">`);
  const subject = d.title.match(/^Where (.+) (?:is|are) used$/)?.[1]?.toLowerCase();
  // The name from a word start, so "Where a data table is used" and "Where switches are used" pass.
  if (!subject || !names.some((n) => (` ${subject}`).includes(` ${n.toLowerCase()}`))) {
    problems.push(`<title> must be "Where … is used" (or "are used") and name the page (${names.join(" or ")}); it is "${d.title}"`);
  }
  if (!/^[A-Z][^.]*[^.\s]\.$/.test(d.desc)) problems.push(`<desc> must be one sentence ending in a full stop; it is "${d.desc}"`);
  for (const [re, what] of FORBIDDEN) if (/** @type {RegExp} */ (re).test(svg)) problems.push(`must not contain ${what}`);
  for (const m of svg.matchAll(new RegExp(`\\s(${COLOR_ATTRS.join("|")})="([^"]*)"`, "g"))) {
    const [, name, value] = m;
    const token = value.match(/^var\((--dui-[a-z0-9-]+)\)$/)?.[1];
    if (token ? !tokens.has(token) : !["currentColor", "none", "transparent"].includes(value)) {
      problems.push(`${name}="${value}": use currentColor, none, transparent or var(--dui-…) with a semantic token${token ? ` (${token} is not in css/tokens/semantic.css)` : ""}`);
    } else if (name in FORCED && !FORCED[/** @type {keyof typeof FORCED} */ (name)].includes(value) && !(name === "stroke" && token?.startsWith("--dui-color-accent-"))) {
      problems.push(`${name}="${value}": site.css has no forced-colours rule for it; use one of ${FORCED[/** @type {keyof typeof FORCED} */ (name)].join(", ")}`);
    }
  }
  if (!/="var\(--dui-color-accent[a-z-]*\)"/.test(svg)) problems.push("must highlight the element with the accent token (var(--dui-color-accent…))");
  const bytes = Buffer.byteLength(svg);
  if (bytes > MAX_BYTES) problems.push(`is ${bytes} bytes; keep it under ${MAX_BYTES}`);
  return problems;
}

/**
 * Throw when a page that needs a diagram has none, a file has no page, or
 * a file breaks the rules. Pages that need one have `diagram` set.
 * @param {{ path: string, heading: string, diagram?: string }[]} pages
 * @param {Map<string, Diagram>} diagrams
 * @param {(page: { path: string }) => string} label the page's sidebar label
 * @param {string} root
 */
export function checkDiagrams(pages, diagrams, label, root) {
  const semantic = join(root, "css/tokens/semantic.css");
  const tokens = new Set(existsSync(semantic) ? [...readFileSync(semantic, "utf8").matchAll(/^\s*(--dui-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]) : []);
  const errors = [];
  const wanted = new Map(pages.filter((p) => p.diagram).map((p) => [p.diagram, p]));
  for (const [name, page] of wanted) if (!diagrams.has(name)) errors.push(`${DIAGRAM_DIR}/${name}.svg: missing; ${page.path} needs a diagram`);
  for (const d of diagrams.values()) {
    const page = wanted.get(d.name);
    if (!page) {
      errors.push(`${d.path}: no element or pattern page is named ${d.name}`);
      continue;
    }
    for (const p of diagramProblems(d, [...new Set([page.heading, label(page)])], tokens)) errors.push(`${d.path}: ${p}`);
  }
  if (errors.length) throw new Error(`${DIAGRAM_DIR} is invalid (see site/README.md, "Diagrams"):\n  ${errors.join("\n  ")}`);
}

/**
 * The page block: the inline svg in a figure, and one line of Markdown.
 * @param {Diagram} d
 */
export function diagramBlock(d) {
  return { md: `_Diagram: ${d.desc}_`, html: () => `<figure class="docs-diagram">\n${d.svg}\n</figure>` };
}
