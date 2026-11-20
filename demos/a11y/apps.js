// @ts-check
/**
 * The demo apps under test: where each one's static output lives, how to
 * serve it, and the URL of each view. Paths are relative to demos/a11y.
 */
export const apps = {
  // No build: serve the repository root so ../../css/domestic.css resolves.
  vanilla: {
    root: "../..",
    port: 4301,
    spa: false,
    views: [
      { path: "/demos/vanilla/index.html", title: "Dashboard · Homebase" },
      { path: "/demos/vanilla/settings.html", title: "Account settings · Homebase" },
    ],
  },
  react: {
    root: "../react/dist",
    port: 4302,
    spa: false,
    views: [
      { path: "/", title: "Dashboard · Homebase" },
      { path: "/settings.html", title: "Account settings · Homebase" },
    ],
  },
  angular: {
    root: "../angular/dist/angular/browser",
    port: 4303,
    spa: true,
    views: [
      { path: "/", title: "Dashboard · Homebase" },
      { path: "/settings", title: "Account settings · Homebase" },
    ],
  },
  astro: {
    root: "../astro/dist",
    port: 4304,
    spa: false,
    views: [
      { path: "/", title: "Dashboard · Homebase" },
      { path: "/settings/", title: "Account settings · Homebase" },
    ],
  },
};

/** Apps selected by DEMO_APP (one name), or all of them. */
export function selectedApps() {
  const name = process.env.DEMO_APP;
  if (!name) return Object.keys(apps);
  if (!(name in apps)) throw new Error(`Unknown DEMO_APP "${name}". Use one of: ${Object.keys(apps).join(", ")}`);
  return [name];
}
