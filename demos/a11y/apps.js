// @ts-check
/**
 * The demo apps under test: where each one's static output lives, how to
 * serve it, and the URL of each view. Paths are relative to demos/a11y.
 *
 * Ports: PORT (if set) is the base port, so parallel checkouts do not share
 * servers: vanilla = PORT, react = PORT+1, angular = PORT+2, astro = PORT+3.
 * Without PORT the defaults are 4301-4304.
 */
const basePort = process.env.PORT ? Number(process.env.PORT) : 4301;
if (!Number.isInteger(basePort) || basePort < 1 || basePort > 65532) {
  throw new Error(`PORT must be an integer from 1 to 65532, got "${process.env.PORT}".`);
}

export const apps = {
  // No build: serve the repository root so ../../css/domestic.css resolves.
  vanilla: {
    root: "../..",
    port: basePort,
    spa: false,
    views: [
      { path: "/demos/vanilla/index.html", view: "dashboard", title: "Dashboard · Homebase" },
      { path: "/demos/vanilla/settings.html", view: "settings", title: "Account settings · Homebase" },
      { path: "/demos/vanilla/orders.html", view: "orders", title: "Orders · Homebase" },
    ],
  },
  react: {
    root: "../react/dist",
    port: basePort + 1,
    spa: false,
    views: [
      { path: "/", view: "dashboard", title: "Dashboard · Homebase" },
      { path: "/settings.html", view: "settings", title: "Account settings · Homebase" },
      { path: "/orders.html", view: "orders", title: "Orders · Homebase" },
    ],
  },
  angular: {
    root: "../angular/dist/angular/browser",
    port: basePort + 2,
    spa: true,
    views: [
      { path: "/", view: "dashboard", title: "Dashboard · Homebase" },
      { path: "/settings", view: "settings", title: "Account settings · Homebase" },
      { path: "/orders", view: "orders", title: "Orders · Homebase" },
    ],
  },
  astro: {
    root: "../astro/dist",
    port: basePort + 3,
    spa: false,
    views: [
      { path: "/", view: "dashboard", title: "Dashboard · Homebase" },
      { path: "/settings/", view: "settings", title: "Account settings · Homebase" },
      { path: "/orders/", view: "orders", title: "Orders · Homebase" },
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
