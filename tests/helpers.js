// @ts-check
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Every .html file under examples/, subfolders included, as a path relative to the server root.
export const examples = readdirSync(fileURLToPath(new URL("../examples/", import.meta.url)), { recursive: true })
  .map((name) => String(name).split("\\").join("/"))
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => `examples/${name}`);

export const schemes = /** @type {const} */ (["light", "dark"]);

/** axe-core tags every accessibility test runs with. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Readable summary of axe violations for the failure message. */
export const summarize = (violations) =>
  violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`).join("\n");

/**
 * Fail the test on any request that leaves the local server.
 * data: URIs are not network requests and never reach this handler.
 * WebKit also routes same-origin blob: URLs (in-memory objects created on the
 * page, for example by the video element) through it; those stay local too.
 * @param {import("@playwright/test").Page} page
 * @param {string} baseURL
 */
export async function blockExternalRequests(page, baseURL) {
  const external = [];
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(baseURL) || url.startsWith(`blob:${baseURL}`)) return route.continue();
    external.push(url);
    return route.abort();
  });
  return external;
}

/**
 * Turn every transition off (data-motion="none" on <html>) on each page the test loads,
 * so computed colors and geometry are final as soon as a state changes. Reduced motion
 * no longer does this: it keeps fades and color changes.
 * @param {import("@playwright/test").Page} page
 */
export const withoutMotion = (page) =>
  page.addInitScript(() => {
    const set = () => document.documentElement.setAttribute("data-motion", "none");
    if (document.documentElement) set();
    else
      new MutationObserver((_, observer) => {
        if (!document.documentElement) return;
        set();
        observer.disconnect();
      }).observe(document, { childList: true });
  });
