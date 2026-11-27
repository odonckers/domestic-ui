#!/usr/bin/env node
/*
 * Prints the Baseline status of the web platform features domestic-ui builds on, from the
 * W3C WebDX Community Group's web-features data (https://github.com/web-platform-dx/web-features).
 * docs/ARCHITECTURE.md, section 6, takes its Status column from this output.
 *
 *   npm run platform:status            a table
 *   npm run platform:status -- --json  JSON, one entry per feature
 *
 * Tiers (https://web.dev/baseline): "widely" is in every core browser for 30 months, "newly" is in
 * every core browser, "limited" is missing in at least one; for limited features the engines that
 * ship it are listed.
 */
import { features } from "web-features";

/** web-features ids, in the order of the table in docs/ARCHITECTURE.md, section 6. */
export const FEATURES = [
  ["dialog", "<dialog>"],
  ["popover", "popover"],
  ["invoker-commands", "Invoker commands"],
  ["dialog-closedby", "closedby"],
  ["details-name", "<details name>"],
  ["has", ":has()"],
  ["container-queries", "Container queries"],
  ["light-dark", "light-dark()"],
  ["oklab", "OKLCH"],
  ["relative-color", "Relative colors"],
  ["color-mix", "color-mix()"],
  ["registered-custom-properties", "@property"],
  ["starting-style", "@starting-style"],
  ["anchor-positioning", "Anchor positioning"],
  ["highlight", "Custom Highlight API"],
  ["view-transitions", "View transitions (same document)"],
  ["cross-document-view-transitions", "View transitions (cross document)"],
  ["customizable-select", "Customizable select"],
  ["interest-invokers", "Interest invokers"],
  ["scope", "@scope"],
  ["state", "Custom element states"],
  ["field-sizing", "field-sizing"],
  ["focusgroup", "focusgroup"],
];

const ENGINES = { chrome: "Chromium", firefox: "Firefox", safari: "WebKit" };

/** @param {string} id */
export function status(id) {
  const f = features[id];
  if (!f || f.kind !== "feature") return { id, tier: "unknown" };
  const s = f.status ?? {};
  if (s.baseline === "high") return { id, tier: "widely", since: s.baseline_high_date };
  if (s.baseline === "low") return { id, tier: "newly", since: s.baseline_low_date };
  const engines = Object.keys(ENGINES).filter((k) => s.support?.[k]).map((k) => ENGINES[k]);
  return { id, tier: "limited", engines };
}

const rows = FEATURES.map(([id, name]) => ({ name, ...status(id) }));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  for (const r of rows) {
    const detail = r.tier === "limited" ? r.engines.join(", ") || "no engine" : r.since ?? "";
    console.log(`${r.name.padEnd(36)} ${r.tier.padEnd(8)} ${detail}`);
  }
}
if (rows.some((r) => r.tier === "unknown")) {
  console.error(`Unknown web-features ids: ${rows.filter((r) => r.tier === "unknown").map((r) => r.id).join(", ")}`);
  process.exitCode = 1;
}
