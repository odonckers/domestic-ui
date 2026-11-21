// @ts-check
import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkOtherSystems } from "../site/check-other-systems.mjs";

/*
 * Links in site/data/other-systems.json (see site/check-other-systems.mjs).
 * Browser-independent, so they run in the Chromium project only.
 */
test.beforeEach(({ browserName }) => test.skip(browserName !== "chromium", "browser-independent; run once"));

test("every link to another design system resolves", async () => {
  // Real network: up to 49 URLs, each with a 10 s timeout and one retry.
  test.setTimeout(120_000);
  const { failures, warnings, ok } = await checkOtherSystems();
  // Bot walls, rate limits, server errors and timeouts are not proof a page is gone: report them, do not fail.
  for (const w of warnings) {
    const text = `${w.url}: ${w.reason}${w.status ? ` (${w.status})` : ""}; used by ${w.usedBy.join(", ")}`;
    test.info().annotations.push({ type: "warning", description: text });
    console.warn(`other-systems warning: ${text}`);
  }
  const lines = failures.map((f) => `${f.url}: ${f.reason}${f.status ? ` (${f.status})` : ""}; used by ${f.usedBy.join(", ")}`);
  expect(lines, `dead links in site/data/other-systems.json`).toEqual([]);
  expect(ok.length + warnings.length).toBeGreaterThan(0);
});

test("the link checker applies each rule", async () => {
  /** @type {Record<string, number>} */
  const hits = {};
  const server = createServer((req, res) => {
    const path = req.url ?? "/";
    hits[`${req.method} ${path}`] = (hits[`${req.method} ${path}`] ?? 0) + 1;
    const send = (/** @type {number} */ status, body = "", /** @type {Record<string, string>} */ headers = {}) => {
      res.writeHead(status, { "content-type": "text/html; charset=utf-8", ...headers });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    const page = (/** @type {string} */ title) => `<!DOCTYPE html><html><head><title>\n  ${title}\n</title></head><body></body></html>`;
    switch (path) {
      case "/ok":
        return send(200, page("A page"));
      case "/not-found":
        return send(404);
      case "/gone":
        return send(410);
      case "/teapot":
        return send(418);
      case "/forbidden":
        return send(403);
      case "/rate-limited":
        return send(429);
      case "/server-error":
        return send(503);
      case "/no-head":
        return send(req.method === "HEAD" ? 405 : 200, page("A page"));
      case "/head-forbidden":
        return send(req.method === "HEAD" ? 403 : 200, page("A page"));
      case "/redirect":
        return send(301, "", { location: "/redirected" });
      case "/redirected":
        return send(200, page("A page"));
      case "/redirect-to-404":
        return send(302, "", { location: "/not-found" });
      case "/soft-404":
      case "/soft-home":
        return send(200, page("Generic &amp; Missing"));
      case "/slow":
        return void setTimeout(() => send(200, page("A page")), 1000);
      default:
        return send(404);
    }
  });
  // Port 0: an ephemeral port, never the test server's.
  await new Promise((done) => server.listen(0, "127.0.0.1", () => done(undefined)));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const dir = mkdtempSync(join(tmpdir(), "dui-other-systems-"));
  try {
    const link = (/** @type {string} */ path) => ({ url: `${base}${path}`, title: path });
    const file = join(dir, "other-systems.json");
    writeFileSync(
      file,
      JSON.stringify({
        systems: {
          apple: { name: "A", home: `${base}/ok` },
          material: { name: "M" },
          // The soft-404 title applies to page URLs only, not to the home page.
          geist: { name: "G", home: `${base}/soft-home`, soft404Title: "Generic & Missing" },
        },
        pages: {
          one: { apple: link("/ok"), material: link("/not-found"), geist: link("/soft-404") },
          two: { apple: link("/gone"), material: link("/teapot"), geist: null },
          three: { apple: link("/forbidden"), material: link("/rate-limited"), geist: null },
          four: { apple: link("/server-error"), material: link("/no-head"), geist: link("/redirect") },
          five: { apple: link("/redirect-to-404"), material: link("/slow"), geist: null },
          six: { apple: link("/head-forbidden"), material: null, geist: null },
        },
      }),
    );
    const report = await checkOtherSystems({ file, timeoutMs: 300, concurrency: 3 });
    const paths = (/** @type {{ url: string }[]} */ list) => list.map((r) => r.url.slice(base.length)).sort();

    expect(paths(report.ok)).toEqual(["/head-forbidden", "/no-head", "/ok", "/redirect", "/soft-home"].sort());
    expect(paths(report.failures)).toEqual(["/gone", "/not-found", "/redirect-to-404", "/soft-404", "/teapot"].sort());
    expect(paths(report.warnings)).toEqual(["/forbidden", "/rate-limited", "/server-error", "/slow"].sort());

    // The title is compared trimmed and entity-decoded ("Generic &amp; Missing").
    const soft = report.failures.find((r) => r.url.endsWith("/soft-404"));
    expect(soft?.reason).toBe('soft 404: <title> is "Generic & Missing"');
    expect(soft?.usedBy).toEqual(["one (geist)"]);

    const status = (/** @type {string} */ path) => [...report.ok, ...report.failures, ...report.warnings].find((r) => r.url === `${base}${path}`)?.status;
    expect(status("/gone")).toBe(410);
    expect(status("/teapot")).toBe(418);
    expect(status("/redirect"), "redirects are followed").toBe(200);
    expect(status("/redirect-to-404")).toBe(404);
    expect(status("/slow")).toBeNull();
    expect(report.warnings.find((r) => r.url.endsWith("/slow"))?.reason).toBe("timeout after 300 ms");

    // HEAD first; GET only after 405/501 or a 4xx/5xx other than 404 and 410; soft-404 systems GET at once.
    expect(hits["HEAD /ok"]).toBe(1);
    expect(hits["GET /ok"], "/ok answered HEAD with 200").toBeUndefined();
    expect(hits["GET /no-head"]).toBe(1);
    expect(hits["GET /head-forbidden"]).toBe(1);
    expect(hits["GET /forbidden"]).toBe(1);
    expect(hits["GET /not-found"], "a 404 on HEAD is final").toBeUndefined();
    expect(hits["HEAD /soft-404"]).toBeUndefined();
    expect(hits["GET /soft-404"]).toBe(1);
    expect(hits["HEAD /soft-home"], "a home page is checked like any link").toBe(1);
    // A timeout is retried once before it is a warning.
    expect(hits["HEAD /slow"]).toBe(2);
  } finally {
    server.closeAllConnections();
    await new Promise((done) => server.close(() => done(undefined)));
    rmSync(dir, { recursive: true, force: true });
  }
});
