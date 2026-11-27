# Security policy

Please report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/odonckers/domestic-ui/security/advisories/new).

Do not open a public issue for a security report. We will respond through that private advisory.

## Dependency reviews

The library itself ships no runtime dependencies: `css/` and `web-components/` are plain files. Dev tooling and the
[demo apps](demos/README.md) do install packages. Every new direct dependency gets a review here, in the PR that adds it,
covering what it is for, where it runs, its license, who publishes it, its install scripts and `npm audit`.
Lockfiles are committed and CI installs with `npm ci`.

| Package | Used by | Runs | License | Publisher | Install scripts | Audit | Reviewed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`vue`](https://github.com/vuejs/core) 3.5 | `demos/vue` | In the browser (demo only) | MIT | Vue core team (vuejs org) | None | 0 vulnerabilities | 2026-11-27 |
| [`@vitejs/plugin-vue`](https://github.com/vitejs/vite-plugin-vue) 6.0 | `demos/vue` | Build time only | MIT | Vite team (vitejs org) | None | 0 vulnerabilities | 2026-11-27 |
| [`svelte`](https://github.com/sveltejs/svelte) 5 | `demos/svelte` | Build time (compiler) and in the browser (small runtime, demo only) | MIT | Svelte core team (sveltejs org) | None | 0 vulnerabilities | 2026-11-27 |
| [`@sveltejs/vite-plugin-svelte`](https://github.com/sveltejs/vite-plugin-svelte) 7.3 | `demos/svelte` | Build time only | MIT | Svelte core team (sveltejs org) | None | 0 vulnerabilities | 2026-11-27 |
| [`vite`](https://github.com/vitejs/vite) 8 | `demos/react`, `demos/vue`, `demos/svelte` | Build time and local dev server only | MIT | Vite team (vitejs org) | None | 0 vulnerabilities | 2026-11-27 |

Notes from the 2026-11-27 review:

- The Vue app installs 36 packages and the Svelte app 39, all under MIT, ISC, BSD, Apache-2.0 or MPL-2.0 (`lightningcss`, via Vite). The only install script in either tree is the optional, macOS-only `fsevents`.
- None of these packages reaches a user of domestic-ui: they live in each demo's own `package.json`, never the repository root, and nothing under `css/` or `web-components/` imports them.
- The Vite dev server is for local use only; the demos are checked from static `dist/` output served by `demos/a11y/serve.mjs`.
- Dependencies that predate this section (root dev tooling and the React, Angular and Astro demos) are not reviewed here yet.
