#!/usr/bin/env node
/*
 * Run the screenshot spec in the same Playwright image CI uses, from any OS.
 *   npm run test:visual:docker                 compare against the baselines
 *   npm run test:visual:docker -- --update-snapshots   rewrite them
 * Extra arguments go to `playwright test` (for example `-g catalog`).
 *
 * The image tag is read from @playwright/test in package.json, so it cannot
 * drift from the version CI pins. It reuses the host's node_modules (run
 * `npm ci` first): the Playwright test runner is plain JavaScript, so a macOS
 * or Windows install works inside the Linux container.
 * https://playwright.dev/docs/docker
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = String(pkg.devDependencies["@playwright/test"]).replace(/^[^\d]*/, "");
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
if (!existsSync(new URL("../node_modules/@playwright/test", import.meta.url))) {
  console.error("Run `npm ci` first: the container uses this checkout's node_modules.");
  process.exit(1);
}
const port = process.env.PORT || "4173";
const args = process.argv.slice(2).map((arg) => `'${arg.replaceAll("'", "'\\''")}'`).join(" ");
const user = typeof process.getuid === "function" ? ["-u", `${process.getuid()}:${process.getgid?.()}`, "-e", "HOME=/tmp"] : [];

const command = `npx playwright test tests/visual.spec.js --project=chromium ${args}`;
const run = spawnSync(
  "docker",
  ["run", "--rm", "--ipc=host", ...user, "-e", `PORT=${port}`, "-v", `${root}:/work`, "-w", "/work", image, "bash", "-lc", command],
  { stdio: "inherit" },
);
if (run.error) {
  console.error(`Could not start docker (${run.error.message}). Install Docker, or run \`npm run test:visual\` on Linux.`);
  process.exit(1);
}
process.exit(run.status ?? 1);
