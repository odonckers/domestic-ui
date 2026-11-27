import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // The dui-* tags are custom elements (../../web-components/), not Vue components.
          // <search> is a native element that Vue's tag list may not know yet:
          // https://html.spec.whatwg.org/multipage/grouping-content.html#the-search-element
          // https://vuejs.org/guide/extras/web-components.html#using-custom-elements-in-vue
          isCustomElement: (tag) => tag.startsWith('dui-') || tag === 'search',
        },
      },
    }),
  ],
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
