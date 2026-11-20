// @ts-check
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Every examples/*.html file, as a path relative to the server root. */
export const examples = readdirSync(fileURLToPath(new URL("../examples/", import.meta.url)))
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => `examples/${name}`);

export const schemes = /** @type {const} */ (["light", "dark"]);

/**
 * Fail the test on any request that leaves the local server.
 * data: URIs are not network requests and never reach this handler.
 * @param {import("@playwright/test").Page} page
 * @param {string} baseURL
 */
export async function blockExternalRequests(page, baseURL) {
  const external = [];
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(baseURL)) return route.continue();
    external.push(url);
    return route.abort();
  });
  return external;
}
