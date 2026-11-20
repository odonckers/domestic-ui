import type { CSSProperties, ReactNode } from 'react'
import '../../../css/domestic.css'
import './page.css'

type View = 'dashboard' | 'settings'

const links: { view: View; href: string; label: string }[] = [
  { view: 'dashboard', href: '/', label: 'Dashboard' },
  { view: 'settings', href: '/settings.html', label: 'Account settings' },
]

export default function Layout({ current, children }: { current: View; children: ReactNode }) {
  return (
    <>
      <a className="visually-hidden" href="#main">Skip to main content</a>

      <header className="cluster" style={{ '--cluster-justify': 'space-between' } as CSSProperties}>
        <p><strong>Homebase</strong></p>
        <nav aria-label="Primary">
          <ul className="cluster">
            {links.map(({ view, href, label }) => (
              <li key={view}>
                <a href={href} aria-current={view === current ? 'page' : undefined}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">{children}</main>

      <footer>
        <p><small>Homebase is a domestic-ui demo app. MIT licensed.</small></p>
      </footer>
    </>
  )
}
