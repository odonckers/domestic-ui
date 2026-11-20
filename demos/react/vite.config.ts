import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // The shipped stylesheet lives outside this app, in the repo's css/ folder.
      allow: ['.', '../../css'],
    },
  },
  build: {
    rollupOptions: {
      // Multi-page app: one HTML entry per view, so each has a real URL.
      // https://vite.dev/guide/build#multi-page-app
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        settings: fileURLToPath(new URL('./settings.html', import.meta.url)),
      },
    },
  },
})
