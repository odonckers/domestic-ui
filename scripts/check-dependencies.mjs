#!/usr/bin/env node
/*
 * Dependency review check (`npm run lint:deps`).
 *
 * Every external dependency needs a security review in the "Dependency
 * reviews" section of SECURITY.md before it lands. This script collects the
 * direct dependencies the repository declares and fails when one has no
 * review, or when a review no longer matches anything we use.
 *
 * What counts as a direct dependency:
 * - npm: `dependencies`, `devDependencies`, `optionalDependencies` and
 *   `peerDependencies` in package.json and demos/<app>/package.json.
 * - GitHub Actions: every `uses: owner/repo@ref` in .github/workflows/.
 * - Container images: every `image:` in .github/workflows/.
 *
 * A review is a table row whose first cell holds the name in backticks, such
 * as | [`stylelint`](…) 18.1 | …, and whose last cell is the review date
 * (YYYY-MM-DD). A row for `@angular/*` covers every package in that scope. Transitive packages are covered by the lockfiles and `npm audit`,
 * not by a review each.
 *
 * Zero dependencies on purpose.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const reviewFile = join(root, "SECURITY.md");
const rel = (p) => relative(root, p);

/** @type {Map<string, Set<string>>} dependency name -> files that declare it */
const used = new Map();
const add = (name, file) => {
  if (!used.has(name)) used.set(name, new Set());
  used.get(name).add(rel(file));
};

// npm manifests: the root and each demo app.
const manifests = [join(root, "package.json")];
const demos = join(root, "demos");
for (const entry of readdirSync(demos, { withFileTypes: true })) {
  const file = join(demos, entry.name, "package.json");
  if (entry.isDirectory() && existsSync(file)) manifests.push(file);
}
for (const file of manifests) {
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const name of Object.keys(pkg[field] ?? {})) add(name, file);
  }
}

// GitHub Actions and container images.
const workflows = join(root, ".github", "workflows");
for (const name of readdirSync(workflows)) {
  if (!/\.ya?ml$/.test(name)) continue;
  const file = join(workflows, name);
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const uses = line.match(/^\s*(?:-\s*)?uses:\s*["']?([^@\s"']+)@/);
    // Local actions (./path) and reusable workflows in this repo are ours.
    if (uses && !uses[1].startsWith("./")) add(uses[1].split("/").slice(0, 2).join("/"), file);
    const image = line.match(/^\s*image:\s*["']?([^\s"']+)/);
    if (image) add(image[1].replace(/[:@].*$/, ""), file);
  }
}

// Reviews: table rows in SECURITY.md whose first cell names a package in backticks.
const reviews = new Map();
if (existsSync(reviewFile)) {
  for (const line of readFileSync(reviewFile, "utf8").split("\n")) {
    const cells = line.trim().startsWith("|") ? line.split("|").slice(1, -1).map((c) => c.trim()) : [];
    const name = cells[0]?.match(/`([^`]+)`/);
    if (name) reviews.set(name[1], /^\d{4}-\d{2}-\d{2}$/.test(cells.at(-1) ?? ""));
  }
}

const covers = (review, name) =>
  review === name || (review.endsWith("/*") && name.startsWith(review.slice(0, -1)));

const errors = [];
for (const [name, files] of [...used].sort(([a], [b]) => a.localeCompare(b))) {
  const review = [...reviews.keys()].find((r) => covers(r, name));
  if (!review) {
    errors.push(`${name} (${[...files].join(", ")}) has no review in ${rel(reviewFile)}`);
  } else if (!reviews.get(review)) {
    errors.push(`the review row for ${review} does not end with a review date (YYYY-MM-DD)`);
  }
}
for (const review of reviews.keys()) {
  if (![...used.keys()].some((name) => covers(review, name))) {
    errors.push(`${rel(reviewFile)} reviews ${review}, which nothing uses any more; remove the row`);
  }
}

if (errors.length) {
  console.error("Dependency review check failed:\n");
  for (const error of [...new Set(errors)]) console.error(`  - ${error}`);
  console.error(`\nAdd a row to "Dependency reviews" in ${rel(reviewFile)}.`);
  process.exit(1);
}
console.log(`Dependency review check passed: ${used.size} direct dependencies, all reviewed.`);
