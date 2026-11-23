// @ts-check
import { defineConfig, devices } from "@playwright/test";

// PORT lets parallel worktrees run tests at once without reusing each other's server.
const port = Number(process.env.PORT) || 4173;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: {
      // Defaults are disabled animations, a hidden caret and CSS pixels. maxDiffPixels
      // is explicit so one changed pixel fails the shot: a 1px border cannot pass.
      // https://playwright.dev/docs/test-snapshots
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixels: 0,
      timeout: 15_000,
      stylePath: "tests/visual-screenshot.css",
      pathTemplate: "{testDir}/__screenshots__/{arg}{-projectName}{-snapshotSuffix}{ext}",
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${port}/`,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Screenshot baselines are Linux Chromium only (tests/visual.spec.js).
    { name: "firefox", testIgnore: /visual\.spec\.js/, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testIgnore: /visual\.spec\.js/, use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `node scripts/serve.mjs ${port}`,
    url: `http://127.0.0.1:${port}/examples/base.html`,
    reuseExistingServer: !process.env.CI,
  },
});
