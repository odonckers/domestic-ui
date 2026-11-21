// The dui-* tags are custom elements (../../web-components/), not React components:
// tell TypeScript they are valid JSX tags with the usual HTML attributes.
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type CustomElement<Attributes = object> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Attributes

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dui-app-shell': CustomElement<{ 'data-app-shell'?: string }>
      'dui-combobox': CustomElement
      'dui-menu': CustomElement
      'dui-table': CustomElement<{ 'select-all-label'?: string }>
      'dui-toolbar': CustomElement
    }
  }
}
