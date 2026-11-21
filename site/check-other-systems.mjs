#!/usr/bin/env node
// @ts-check
/*
 * Dead-link check for site/data/other-systems.json. Zero dependencies.
 *
 *   node site/check-other-systems.mjs   print one row per URL; exit 1 on any failure
 *
 * Every unique URL under "pages", plus each system's "home", is requested
 * with redirects followed: HEAD first, then GET when HEAD answers 405, 501
 * or any 4xx/5xx other than 404 and 410. On the final response:
 *
 *   2xx                              ok
 *   404, 410, any other 4xx          failure
 *   403, 429, 5xx                    warning (bot walls and rate limits are not proof the page is gone)
 *   timeout, network or DNS error    warning, after one retry
 *
 * A system with "soft404Title" answers 200 for pages that do not exist; its
 * page URLs (not its home) are always fetched with GET, and a 2xx whose
 * <title> equals soft404Title is a failure ("soft 404").
 *
 * tests/docs-other-systems.spec.js runs this in `npm test`.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { unescapeHtml } from "./lib/util.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FILE = join(HERE, "data", "other-systems.json");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * @typedef {{ url: string, status: number | null, reason: string, usedBy: string[] }} Result
 * @typedef {{ failures: Result[], warnings: Result[], ok: Result[] }} Report
 */

/** The trimmed <title> of an HTML document, whitespace collapsed, or null. @param {string} html */
export const titleOf = (html) => {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? unescapeHtml(m[1]).replace(/\s+/g, " ").trim() : null;
};

/**
 * One request; on timeout or network error, one retry.
 * @param {string} url
 * @param {"HEAD" | "GET"} method
 * @param {number} timeoutMs
 * @param {boolean} readBody
 * @returns {Promise<{ status: number, body: string } | { error: string }>}
 */
async function request(url, method, timeoutMs, readBody) {
  let error = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { method, redirect: "follow", headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) });
      const body = readBody && method === "GET" ? await res.text() : "";
      if (!readBody) await res.body?.cancel();
      return { status: res.status, body };
    } catch (e) {
      const err = /** @type {Error & { cause?: { code?: string, message?: string } }} */ (e);
      error = err.name === "TimeoutError" || err.name === "AbortError" ? `timeout after ${timeoutMs} ms` : `network error: ${err.cause?.code ?? err.cause?.message ?? err.message}`;
    }
  }
  return { error };
}

/**
 * Check one URL against the rules above.
 * @param {string} url
 * @param {{ soft404Title: string | null, timeoutMs: number }} options
 * @returns {Promise<{ kind: "ok" | "failure" | "warning", status: number | null, reason: string }>}
 */
export async function checkUrl(url, { soft404Title, timeoutMs }) {
  let res;
  if (soft404Title) {
    res = await request(url, "GET", timeoutMs, true);
  } else {
    res = await request(url, "HEAD", timeoutMs, false);
    if ("status" in res && res.status >= 400 && res.status !== 404 && res.status !== 410) res = await request(url, "GET", timeoutMs, false);
  }
  if ("error" in res) return { kind: "warning", status: null, reason: res.error };
  const { status } = res;
  if (status >= 200 && status < 300) {
    if (soft404Title && titleOf(res.body) === soft404Title) return { kind: "failure", status, reason: `soft 404: <title> is "${soft404Title}"` };
    return { kind: "ok", status, reason: "" };
  }
  if (status === 403 || status === 429) return { kind: "warning", status, reason: status === 403 ? "forbidden (may be a bot wall)" : "rate limited" };
  if (status >= 500) return { kind: "warning", status, reason: "server error" };
  if (status >= 400) return { kind: "failure", status, reason: status === 404 || status === 410 ? "not found" : "client error" };
  return { kind: "warning", status, reason: "unexpected status" };
}

/**
 * Check every unique URL in the data file.
 * @param {{ file?: string, timeoutMs?: number, concurrency?: number }} [options]
 * @returns {Promise<Report>}
 */
export async function checkOtherSystems({ file = DEFAULT_FILE, timeoutMs = 10000, concurrency = 4 } = {}) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  /** @type {Map<string, { soft404Title: string | null, usedBy: string[] }>} */
  const urls = new Map();
  const add = (/** @type {string} */ url, /** @type {string | null} */ soft404Title, /** @type {string} */ usedBy) => {
    const entry = urls.get(url) ?? { soft404Title: null, usedBy: [] };
    entry.soft404Title ??= soft404Title;
    entry.usedBy.push(usedBy);
    urls.set(url, entry);
  };
  for (const [key, system] of Object.entries(data.systems ?? {})) if (system?.home) add(system.home, null, `systems.${key}.home`);
  for (const [page, entry] of Object.entries(data.pages ?? {})) {
    for (const [key, link] of Object.entries(entry ?? {})) {
      if (link?.url) add(link.url, data.systems?.[key]?.soft404Title ?? null, `${page} (${key})`);
    }
  }

  const queue = [...urls.entries()];
  /** @type {Report} */
  const report = { failures: [], warnings: [], ok: [] };
  /** @type {Map<string, Result & { kind: string }>} */
  const results = new Map();
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [url, { soft404Title, usedBy }] = next;
      results.set(url, { url, usedBy, ...(await checkUrl(url, { soft404Title, timeoutMs })) });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  // Report in data-file order, whatever order requests finished in.
  for (const url of urls.keys()) {
    const { kind, ...result } = /** @type {Result & { kind: string }} */ (results.get(url));
    (kind === "ok" ? report.ok : kind === "failure" ? report.failures : report.warnings).push(result);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await checkOtherSystems();
  const row = (/** @type {string} */ result) => (/** @type {Result} */ r) => [result, String(r.status ?? "-"), r.url, r.reason];
  const rows = [...report.failures.map(row("FAIL")), ...report.warnings.map(row("warn")), ...report.ok.map(row("ok"))];
  const width = Math.max(...rows.map((r) => r[2].length), 3);
  console.log(`Result  Status  ${"URL".padEnd(width)}  Detail`);
  for (const [result, status, url, reason] of rows) console.log(`${result.padEnd(6)}  ${status.padEnd(6)}  ${url.padEnd(width)}  ${reason}`.trimEnd());
  console.log(`\n${report.ok.length} ok, ${report.warnings.length} warnings, ${report.failures.length} failures.`);
  if (report.failures.length) {
    for (const r of report.failures) console.error(`FAIL ${r.url}: ${r.reason} (${r.status ?? "-"}); used by ${r.usedBy.join(", ")}`);
    process.exit(1);
  }
}
