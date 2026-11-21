// <dui-combobox> is a custom element (../../web-components/dui-combobox.js), not a React component:
// tell TypeScript it is a valid JSX tag with the usual HTML attributes.
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dui-combobox': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}
