// @ts-check
import { test, expect } from "@playwright/test";
import { examples, withoutMotion } from "./helpers.js";

/*
 * Colored leading edges (a border-inline-start wider than --dui-border-width
 * and not transparent) have square leading corners, in LTR and RTL, so the
 * edge is straight instead of following the box's border-radius:
 * https://www.w3.org/TR/css-backgrounds-3/#corner-shaping
 * Every example page is checked with every <details> open and every data
 * table row selected; the pages below must show at least one edge each.
 */

/** Pages that show a colored leading edge, and what draws it. */
const MUST_HAVE_EDGE = {
  "examples/base.html": "blockquote",
  "examples/atoms/field.html": "invalid field",
  "examples/molecules/alerts.html": "alert variants",
  "examples/molecules/nav.html": "current nav link",
  "examples/layouts/list-detail.html": "selected list-detail item",
  "examples/organisms/data-table.html": "selected table row",
};

test("the pages with leading edges are picked up", () => {
  for (const path of Object.keys(MUST_HAVE_EDGE)) expect(examples).toContain(path);
});

/**
 * Every visible element with a colored leading edge, and its physical start-side radii.
 * @param {import("@playwright/test").Page} page
 */
const leadingEdges = (page) =>
  page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.borderInlineStart = "var(--dui-border-width) solid";
    document.body.append(probe);
    const base = parseFloat(getComputedStyle(probe).borderInlineStartWidth);
    probe.remove();

    const found = [];
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.writingMode !== "horizontal-tb") continue;
      if (parseFloat(style.borderInlineStartWidth) <= base) continue;
      const color = style.borderInlineStartColor;
      if (color === "transparent" || /^rgba\(.*,\s*0\)$/.test(color)) continue;
      const side = style.direction === "rtl" ? "right" : "left";
      const id = el.id ? `#${el.id}` : "";
      found.push({
        element: `${el.tagName.toLowerCase()}${id} "${(el.textContent ?? "").trim().slice(0, 30)}"`,
        top: style.getPropertyValue(`border-top-${side}-radius`),
        bottom: style.getPropertyValue(`border-bottom-${side}-radius`),
      });
    }
    return found;
  });

for (const dir of ["ltr", "rtl"]) {
  test.describe(`leading edges (${dir})`, () => {
    for (const path of examples) {
      test(`colored leading edges on ${path} have square leading corners`, async ({ page }) => {
        await withoutMotion(page);
        await page.goto(path);
        await page.evaluate((dir) => {
          document.documentElement.setAttribute("dir", dir);
          for (const details of document.querySelectorAll("details")) details.open = true;
          for (const box of document.querySelectorAll("table[data-table] > tbody input[type='checkbox']")) {
            /** @type {HTMLInputElement} */ (box).checked = true;
          }
        }, dir);

        const edges = await leadingEdges(page);
        if (path in MUST_HAVE_EDGE) expect(edges.length, `${MUST_HAVE_EDGE[path]} on ${path}`).toBeGreaterThan(0);
        const curved = edges.filter((e) => parseFloat(e.top) !== 0 || parseFloat(e.bottom) !== 0);
        expect(curved, JSON.stringify(curved, null, 2)).toEqual([]);
      });
    }
  });
}
