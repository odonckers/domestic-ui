// @ts-check
import { test, expect } from "@playwright/test";
import { schemes, withoutMotion } from "./helpers.js";

/*
 * Visited links: content links take --dui-color-link-visited, navigational
 * links keep their link color (css/base/typography.css, PRINCIPLES.md
 * "Links: visited state").
 *
 * :visited cannot be read from script: getComputedStyle returns the unvisited
 * style and selector APIs never match it, for privacy
 * (https://developer.mozilla.org/en-US/docs/Web/CSS/:visited). And Chromium and
 * WebKit never paint a link as visited in Playwright's throwaway contexts, even
 * after the page was loaded or the link clicked. So two tests:
 *
 * 1. Every engine: the stylesheets are served with ":visited" rewritten to
 *    "[data-visited]" (same specificity, 0,1,0) and the links get that
 *    attribute, so the real rules, layers and specificity decide the computed
 *    color, which getComputedStyle reports honestly.
 * 2. Firefox only, the one engine that paints history here: the real :visited
 *    state, read from screenshot pixels, in normal and forced colors.
 */

const NAVIGATIONAL = `
  <div role="navigation" aria-label="Role navigation"><a href="/x">Role navigation</a></div>
  <div role="toolbar" aria-label="Tools"><a href="/x">Toolbar link</a></div>
  <div role="tablist"><a href="/x" role="tab">Tab link</a></div>
  <div role="menu"><a href="/x" role="menuitem">Menu item</a></div>
  <p><a href="/x" data-link="quiet nav">Quiet nav</a></p>
  <p><a href="#main">Fragment link</a></p>
`;

const CONTENT = `
  <ul><li><a href="/x">List link</a></li></ul>
  <table><caption>T</caption><tr><td><a href="/x">Cell link</a></td></tr></table>
  <section aria-label="S"><h3><a href="/x">Heading link</a></h3></section>
`;

test.describe("visited links (selector logic, :visited as an attribute)", () => {
  for (const scheme of schemes) {
    test(`content links take the visited color, navigational links do not (${scheme})`, async ({ page }) => {
      await withoutMotion(page);
      await page.emulateMedia({ colorScheme: scheme });
      await page.route("**/css/**/*.css", async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replaceAll(":visited", "[data-visited]");
        await route.fulfill({ response, body });
      });
      await page.goto("examples/atoms/link.html");

      const result = await page.evaluate(
        ({ navigational, content }) => {
          const main = document.querySelector("main");
          const add = (html, kind) => {
            const box = document.createElement("div");
            box.dataset.kind = kind;
            box.innerHTML = html;
            main.append(box);
          };
          add(navigational, "nav");
          add(content, "content");
          for (const a of document.querySelectorAll("a[href]")) a.setAttribute("data-visited", "");

          const token = (name) => {
            const probe = document.createElement("span");
            probe.style.color = `var(${name})`;
            main.append(probe);
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
          };
          const color = (a) => getComputedStyle(a).color;
          const demo = document.querySelector("#visited-title").closest("section");
          return {
            link: token("--dui-color-link"),
            visited: token("--dui-color-link-visited"),
            demoContent: color(demo.querySelector("p > a")),
            demoNav: color(demo.querySelector("nav a")),
            demoMarked: color(demo.querySelector('a[data-link~="nav"]')),
            nav: [...main.querySelectorAll('[data-kind="nav"] a')].map((a) => [a.textContent, color(a)]),
            content: [...main.querySelectorAll('[data-kind="content"] a')].map((a) => [a.textContent, color(a)]),
          };
        },
        { navigational: NAVIGATIONAL, content: CONTENT },
      );

      expect(result.visited).not.toBe(result.link);
      expect(result.demoContent).toBe(result.visited);
      expect(result.demoNav).toBe(result.link);
      expect(result.demoMarked).toBe(result.link);
      for (const [name, value] of result.nav) expect(value, name).not.toBe(result.visited);
      for (const [name, value] of result.content) expect(value, name).toBe(result.visited);
    });
  }

  test("a link styled as a button keeps the button text color", async ({ page }) => {
    await page.route("**/css/**/*.css", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replaceAll(":visited", "[data-visited]") });
    });
    await page.goto("examples/atoms/button.html");
    const link = page.getByRole("link", { name: "Read the guide" });
    const before = await link.evaluate((el) => getComputedStyle(el).color);
    await link.evaluate((el) => el.setAttribute("data-visited", ""));
    expect(await link.evaluate((el) => getComputedStyle(el).color)).toBe(before);
  });
});

/**
 * Pixels of an element's screenshot that match a color, within a tolerance
 * for rounding. Antialiased edges blend toward the background, so only the
 * solid parts of glyphs and the underline count.
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").Locator} locator
 * @param {string[]} colors computed rgb() strings
 */
async function countPixels(page, locator, colors) {
  const png = (await locator.screenshot()).toString("base64");
  return page.evaluate(
    async ({ png, colors }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      const { data } = context.getImageData(0, 0, img.width, img.height);
      const targets = colors.map((c) => c.match(/\d+/g).slice(0, 3).map(Number));
      const counts = targets.map(() => 0);
      for (let i = 0; i < data.length; i += 4) {
        targets.forEach(([r, g, b], t) => {
          if (Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b) <= 12) counts[t] += 1;
        });
      }
      return counts;
    },
    { png, colors },
  );
}

test.describe("visited links (real :visited, Firefox)", () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== "firefox", "Only Firefox paints :visited in Playwright's contexts");
    await withoutMotion(page);
  });

  // Every demo link has href="", the page being viewed, so it is in history.
  const demo = (page) => page.locator("section").filter({ has: page.locator("#visited-title") });
  const links = (page) => ({
    content: demo(page).getByRole("link", { name: "read about quiet links" }),
    nav: demo(page).getByRole("navigation", { name: "Atoms" }).getByRole("link", { name: "Quiet link" }),
    marked: demo(page).locator('a[data-link~="nav"]'),
  });

  const resolve = (page, values) =>
    page.evaluate((values) => {
      return values.map((value) => {
        const probe = document.createElement("span");
        probe.style.color = value;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
    }, values);

  for (const scheme of schemes) {
    test(`content link paints the visited color, nav links the link color (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("examples/atoms/link.html");
      await page.addStyleTag({ content: "#visited-title ~ .demo a { font-size: 2.5rem; }" });
      const [visited, link] = await resolve(page, ["var(--dui-color-link-visited)", "var(--dui-color-link)"]);
      const { content, nav, marked } = links(page);

      // Firefox looks up history asynchronously after load, so the first paint can still be unvisited.
      await expect.poll(async () => (await countPixels(page, content, [visited, link]))[0], { message: "content link shows the visited color" }).toBeGreaterThan(0);
      const [, contentLink] = await countPixels(page, content, [visited, link]);
      expect(contentLink).toBe(0);

      for (const [name, locator] of [["nav", nav], ["data-link=nav", marked]]) {
        const [navVisited, navLink] = await countPixels(page, locator, [visited, link]);
        expect(navLink, `${name} link shows the link color`).toBeGreaterThan(0);
        expect(navVisited, name).toBe(0);
      }
    });
  }

  test("forced colors: content link is VisitedText, nav links are LinkText", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("examples/atoms/link.html");
    await page.addStyleTag({ content: "#visited-title ~ .demo a { font-size: 2.5rem; }" });
    const [visited, link] = await resolve(page, ["VisitedText", "LinkText"]);
    expect(visited).not.toBe(link);
    const { content, nav, marked } = links(page);

    // Firefox looks up history asynchronously after load, so the first paint can still be unvisited.
    await expect.poll(async () => (await countPixels(page, content, [visited, link]))[0], { message: "content link shows VisitedText" }).toBeGreaterThan(0);
    const [, contentLink] = await countPixels(page, content, [visited, link]);
    expect(contentLink).toBe(0);

    for (const [name, locator] of [["nav", nav], ["data-link=nav", marked]]) {
      const [navVisited, navLink] = await countPixels(page, locator, [visited, link]);
      expect(navLink, `${name} link shows LinkText`).toBeGreaterThan(0);
      expect(navVisited, name).toBe(0);
    }
  });
});
