import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Svelte renders unknown tags with a hyphen (the dui-* custom elements) as elements as is.
  plugins: [svelte()],
  server: {
    fs: {
      // The shipped stylesheet and web components live outside this app, in the repo's
      // css/ and web-components/ folders.
      allow: ['.', '../../css', '../../web-components'],
    },
  },
  build: {
    rollupOptions: {
      // Multi-page app: one HTML entry per view, so each has a real URL.
      // https://vite.dev/guide/build#multi-page-app
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        settings: fileURLToPath(new URL('./settings.html', import.meta.url)),
        orders: fileURLToPath(new URL('./orders.html', import.meta.url)),
      },
    },
  },
})
