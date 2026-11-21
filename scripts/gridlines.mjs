#!/usr/bin/env node
/*
 * Alignment pass helper: runs the vendored gridlines audit
 * (.claude/skills/gridlines/audit.mjs, unmodified upstream) against this
 * repository's pages with this repository's Playwright, at our review widths.
 * A manual tool, not a CI gate; see .claude/skills/gridlines/DOMESTIC-UI.md.
 *
 *   npm run gridlines -- <page> [widths] [prep.mjs]
 *     page     a path from the repo root (examples/app-shell.html) or a full URL
 *     widths   comma-separated viewport widths (default 1280,390)
 *     prep.mjs default-exports async (page) => {} to open a menu, tab or dialog first
 *
 * Captures (PNG with guides, JSON) go to .gridlines/, which is gitignored.
 * For a path, it starts scripts/serve.mjs on GRIDLINES_PORT (default 4517)
 * and stops it afterwards; if that port is taken it asks the OS for a free
 * one, so it never measures another checkout's server by accident. Set
 * GRIDLINES_REUSE=1 to use a server already listening on GRIDLINES_PORT.
 * TAG, SCHEME, SETTLE_MS, CONTAINERS and CHROMIUM_PATH pass through to audit.mjs.
 *
 * Three probe blind spots for this repository, worked around by a small prep
 * written to .gridlines/ that runs the given prep first and then, in the
 * throwaway headless page only:
 *   - it skips text under .sr-only but not our .visually-hidden: those get sr-only
 *     (no CSS here styles .sr-only, so nothing moves);
 *   - it measures the children of a closed <details>, which are not drawn: they
 *     get sr-only too;
 *   - it skips everything under aria-hidden="true", which is how every decorative
 *     icon here is marked: the attribute is removed from <svg>s so icon columns count.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const audit = join(root, ".claude/skills/gridlines/audit.mjs");
const [page, widths = "1280,390", prep] = process.argv.slice(2);
if (!page) {
  console.error("usage: npm run gridlines -- <page> [widths=1280,390] [prep.mjs]");
  process.exit(1);
}

/** Resolves to the port if nothing listens on it, otherwise to a free port the OS picks. */
const freePort = (port) =>
  new Promise((resolve) => {
    const probe = createServer()
      .once("error", () => {
        const any = createServer().listen(0, "127.0.0.1", () => {
          const { port: picked } = /** @type {import("node:net").AddressInfo} */ (any.address());
          any.close(() => resolve(picked));
        });
      })
      .listen(port, "127.0.0.1", () => probe.close(() => resolve(port)));
  });

let server;
let url = page;
if (!/^[a-z]+:/i.test(page)) {
  const wanted = Number(process.env.GRIDLINES_PORT) || 4517;
  const port = process.env.GRIDLINES_REUSE ? wanted : await freePort(wanted);
  if (!process.env.GRIDLINES_REUSE) {
    server = spawn(process.execPath, [join(root, "scripts/serve.mjs"), String(port)], { stdio: "ignore" });
    process.on("exit", () => server.kill());
  }
  const base = `http://127.0.0.1:${port}/`;
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${base}examples/base.html`)).ok) break;
    } catch {}
    if (i > 50) throw new Error(`no server at ${base}`);
    await new Promise((r) => setTimeout(r, 100));
  }
  url = new URL(page.replace(/^\/+/, ""), base).href;
}

const out = join(root, ".gridlines");
mkdirSync(out, { recursive: true });
const wrapped = join(out, `prep-${process.pid}.mjs`);
writeFileSync(
  wrapped,
  `export default async (page) => {
  ${prep ? `await (await import(${JSON.stringify(pathToFileURL(resolve(prep)).href)})).default(page);` : ""}
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(".visually-hidden, details:not([open]) > :not(summary)")) el.classList.add("sr-only");
    for (const svg of document.querySelectorAll('svg[aria-hidden="true"]')) svg.removeAttribute("aria-hidden");
  });
};
`,
);

let failed = 0;
for (const width of widths.split(",")) {
  const args = [audit, url, out, width.trim(), wrapped];
  const run = spawnSync(process.execPath, args, { stdio: "inherit", env: { ...process.env, PW_DIR: root } });
  failed ||= run.status ?? 1;
}
server?.kill();
rmSync(wrapped);
process.exit(failed);
