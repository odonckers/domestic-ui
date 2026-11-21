// @ts-check
/*
 * The demo views (dashboard, account settings, orders), read from
 * site/data/demo-views.json: each view's source file per app, and the docs
 * pages it uses. demos.html lists them; each listed page gets a
 * "Demos:" line under See also. The build fails on a path that does not
 * exist, so a renamed demo file cannot leave a dead link.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO_URL } from "./util.mjs";

export const DEMO_VIEWS_PATH = "site/data/demo-views.json";

/**
 * @typedef {object} DemoApp
 * @property {string} id     directory under demos/ ("vanilla")
 * @property {string} title  "Plain HTML"
 *
 * @typedef {object} DemoView
 * @property {string} id
 * @property {string} title        "Account settings"
 * @property {string} description  one plain line
 * @property {Record<string, string>} paths  app id → repo path of the view's source (file or directory)
 * @property {string[]} pages      docs pages it uses, site paths without ".html" ("patterns/nav")
 * @property {Record<string, string>} [notes]  page → a short note shown after the view's name there
 *
 * @typedef {{ apps: DemoApp[], views: DemoView[] }} DemoViews
 */

/**
 * Read and validate the file. Null when it does not exist.
 * @param {string} root repository root
 * @returns {DemoViews | null}
 */
export function loadDemoViews(root) {
  const file = join(root, DEMO_VIEWS_PATH);
  if (!existsSync(file)) return null;
  /** @type {DemoViews} */
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${DEMO_VIEWS_PATH}: not valid JSON: ${/** @type {Error} */ (error).message}`);
  }
  const problems = [];
  if (!Array.isArray(data.apps) || !data.apps.length) problems.push("apps: a non-empty list is required");
  if (!Array.isArray(data.views) || !data.views.length) problems.push("views: a non-empty list is required");
  for (const v of data.views ?? []) {
    for (const key of ["id", "title", "description"]) if (typeof v[key] !== "string" || !v[key]) problems.push(`views["${v.id}"].${key}: a string is required`);
    if (!Array.isArray(v.pages)) problems.push(`views["${v.id}"].pages: a list is required`);
    for (const app of data.apps ?? []) {
      const path = v.paths?.[app.id];
      if (!path) problems.push(`views["${v.id}"].paths.${app.id}: missing`);
      else if (!existsSync(join(root, path))) problems.push(`views["${v.id}"].paths.${app.id}: ${path} does not exist`);
    }
  }
  if (problems.length) throw new Error(`${DEMO_VIEWS_PATH} is invalid:\n  ${problems.join("\n  ")}`);
  return data;
}

/**
 * GitHub URL of a repo path: /tree/ for a directory, /blob/ for a file.
 * @param {string} root
 * @param {string} path
 */
const demoSourceUrl = (root, path) => `${REPO_URL}/${statSync(join(root, path)).isDirectory() ? "tree" : "blob"}/main/${path}`;

/**
 * "[Plain HTML](…), [React](…), …": each app linking the view's source.
 * @param {string} root
 * @param {DemoViews} data
 * @param {DemoView} view
 */
export const demoAppLinksMd = (root, data, view) => data.apps.map((a) => `[${a.title}](${demoSourceUrl(root, view.paths[a.id])})`).join(", ");

/**
 * "Dashboard view ([Plain HTML](…), [React](…), …)"
 * @param {string} root
 * @param {DemoViews} data
 * @param {DemoView} view
 * @param {string} [page] site path without ".html", for the view's note on that page
 */
export const demoViewMd = (root, data, view, page) => {
  const note = page && view.notes?.[page] ? `, ${view.notes[page]}` : "";
  return `${view.title} view${note} (${demoAppLinksMd(root, data, view)})`;
};
