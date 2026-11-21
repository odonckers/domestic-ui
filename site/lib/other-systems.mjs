// @ts-check
/*
 * "How other systems do it": links to how other design systems handle the
 * same thing, read from site/data/other-systems.json. For comparison only;
 * links and their titles, never text or visuals copied from those systems.
 * See site/README.md for the data format. Checked for dead links by
 * site/check-other-systems.mjs.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COMPONENT_GROUPS } from "./discovery.mjs";

/** Repo path of the data file. */
export const OTHER_SYSTEMS_PATH = "site/data/other-systems.json";

/** The systems, in the order they are listed on each page. */
export const SYSTEM_KEYS = /** @type {const} */ (["apple", "material", "geist"]);

export const OTHER_SYSTEMS_HEADING = "How other systems do it";
export const OTHER_SYSTEMS_NOTE = "For comparison only; these are not the standard this system follows.";

/**
 * @typedef {{ url: string, title: string }} Link
 * @typedef {{ name: string, home?: string, soft404Title?: string }} System
 * @typedef {Link | Link[] | null} Entry  one link, a non-empty list of links, or null ("No equivalent")
 * @typedef {{ systems: Record<string, System>, pages: Record<string, Record<string, Entry>> }} OtherSystems
 */

/**
 * The links of one system's entry, in order; [] for null.
 * @param {Entry | undefined} entry
 * @returns {Link[]}
 */
export const linksOf = (entry) => (entry == null ? [] : Array.isArray(entry) ? entry : [entry]);

/**
 * The data file, or null when the repository has none (test fixtures).
 * @param {string} root
 * @returns {OtherSystems | null}
 */
export function loadOtherSystems(root) {
  const file = join(root, OTHER_SYSTEMS_PATH);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${OTHER_SYSTEMS_PATH}: not valid JSON: ${/** @type {Error} */ (error).message}`);
  }
}

/** @param {unknown} url */
const isHttps = (url) => {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Every problem with the data, as one message per problem; [] when valid.
 * @param {OtherSystems} data
 * @param {string[]} pagePaths site paths of every built page ("patterns/tabs.html")
 */
export function validateOtherSystems(data, pagePaths) {
  const problems = [];
  const known = new Set(SYSTEM_KEYS);
  const systems = data?.systems ?? {};
  for (const key of SYSTEM_KEYS) {
    const s = systems[key];
    if (!s || typeof s.name !== "string" || !s.name) problems.push(`systems.${key}: missing, or has no "name"`);
    else if (s.home !== undefined && !isHttps(s.home)) problems.push(`systems.${key}.home: not an https URL`);
  }
  for (const key of Object.keys(systems)) if (!known.has(/** @type {any} */ (key))) problems.push(`systems.${key}: unknown system; expected one of ${SYSTEM_KEYS.join(", ")}`);
  if (!data?.pages || typeof data.pages !== "object") return [...problems, `"pages" is missing`];

  const paths = new Set(pagePaths.map((p) => p.replace(/\.html$/, "")));
  for (const [key, entry] of Object.entries(data.pages)) {
    const at = `pages["${key}"]`;
    if (!paths.has(key)) problems.push(`${at}: no built page ${key}.html`);
    if (!entry || typeof entry !== "object") {
      problems.push(`${at}: not an object`);
      continue;
    }
    for (const system of Object.keys(entry)) if (!known.has(/** @type {any} */ (system))) problems.push(`${at}.${system}: unknown system; expected one of ${SYSTEM_KEYS.join(", ")}`);
    for (const system of SYSTEM_KEYS) {
      if (!(system in entry)) {
        problems.push(`${at}: missing "${system}" (use null for no equivalent)`);
        continue;
      }
      const value = entry[system];
      if (value === null) continue;
      const links = Array.isArray(value) ? value : [value];
      const isLink = (/** @type {any} */ link) => {
        const keys = link && typeof link === "object" && !Array.isArray(link) ? Object.keys(link).sort().join(",") : "";
        return keys === "title,url" && isHttps(link.url) && typeof link.title === "string" && !!link.title.trim();
      };
      if (!links.length || !links.every(isLink)) {
        problems.push(`${at}.${system}: must be null, { "url": "https://…", "title": "…" }, or a non-empty list of those`);
      }
    }
  }
  return problems;
}

/**
 * Pages that are expected to have an entry: base elements, every component
 * in css/components/ and every pattern.
 * @param {import("./discovery.mjs").Model} model
 */
export const comparablePaths = (model) => [
  model.base.sitePath,
  ...COMPONENT_GROUPS.flatMap(({ group }) => model.components[group].map((c) => c.sitePath)),
  ...model.patterns.map((p) => p.sitePath),
];

/** Link text kept literal in Markdown. @param {string} text */
const mdText = (text) => text.replace(/([\\`*_[\]<])/g, "\\$1");

/**
 * The section's Markdown: heading, the comparison-only line, one item per system.
 * @param {OtherSystems} data
 * @param {Record<string, Entry>} entry
 */
export function otherSystemsMd(data, entry) {
  const items = SYSTEM_KEYS.flatMap((key) => {
    const name = data.systems[key].name;
    const links = linksOf(entry[key]);
    return links.length ? links.map((link) => `- [${mdText(`${name}: ${link.title}`)}](${link.url})`) : [`- ${mdText(name)}: No equivalent`];
  });
  return `## ${OTHER_SYSTEMS_HEADING}\n\n${OTHER_SYSTEMS_NOTE}\n\n${items.join("\n")}`;
}

/**
 * Append the section to every page with an entry, as its last block.
 * Throws on invalid data; returns warnings for comparable pages with no entry.
 * @param {import("./pages.mjs").Page[]} pages
 * @param {import("./discovery.mjs").Model} model
 * @param {OtherSystems | null} data
 * @returns {{ pages: import("./pages.mjs").Page[], warnings: string[] }}
 */
export function addOtherSystems(pages, model, data) {
  if (!data) return { pages, warnings: [] };
  const problems = validateOtherSystems(data, pages.map((p) => p.path));
  if (problems.length) throw new Error(`${OTHER_SYSTEMS_PATH} is invalid:\n  ${problems.join("\n  ")}`);
  const missing = comparablePaths(model)
    .map((p) => p.replace(/\.html$/, ""))
    .filter((key) => !(key in data.pages));
  const warnings = missing.length ? [`${OTHER_SYSTEMS_PATH} has no entry for: ${missing.join(", ")}. Add one (null for no equivalent) to list how other systems do it.`] : [];
  return {
    pages: pages.map((p) => {
      const entry = data.pages[p.path.replace(/\.html$/, "")];
      return entry ? { ...p, blocks: [...p.blocks, { md: otherSystemsMd(data, entry) }] } : p;
    }),
    warnings,
  };
}
