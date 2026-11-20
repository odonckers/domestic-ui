// @ts-check
import { defineConfig, devices } from "@playwright/test";
import { apps, selectedApps } from "./apps.js";

const selected = selectedApps();

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.js",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // One project per app: its own server, base URL and tests (picked by the [app] tag in the title).
  projects: selected.map((name) => ({
    name,
    grep: new RegExp(`\\[${name}\\]`),
    use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${apps[name].port}` },
  })),
  webServer: selected.map((name) => {
    const { root, port, spa, views } = apps[name];
    return {
      command: `node serve.mjs --root ${root} --port ${port}${spa ? " --spa" : ""}`,
      url: `http://127.0.0.1:${port}${views[0].path}`,
      reuseExistingServer: !process.env.CI,
    };
  }),
});
