import type { ReactNode } from 'react'
import '../../../css/domestic.css'
import '../../../web-components/dui-app-shell.js'
import '../../../web-components/dui-menu.js'

type View = 'dashboard' | 'settings' | 'orders'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const links: { view: View; href: string; label: string; icon: ReactNode }[] = [
  {
    view: 'dashboard',
    href: '/',
    label: 'Dashboard',
    icon: <svg {...iconProps}><path d="M3 11.5 12 4l9 7.5M5 10v10h14V10"></path></svg>,
  },
  {
    view: 'orders',
    href: '/orders.html',
    label: 'Orders',
    icon: <svg {...iconProps}><path d="M3 4h2l2.5 11h11L21 7H6.2"></path><circle cx="9" cy="19.5" r="1.5"></circle><circle cx="17" cy="19.5" r="1.5"></circle></svg>,
  },
  {
    view: 'settings',
    href: '/settings.html',
    label: 'Account settings',
    icon: <svg {...iconProps}><path d="M4 6h10M4 12h4M12 12h8M4 18h12"></path><circle cx="16" cy="6" r="2"></circle><circle cx="10" cy="12" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>,
  },
]

/** The app shell around every view: app bar, main navigation, main, the optional auxiliary sidebar and the footer. */
export default function Layout({ current, aux, children }: { current: View; aux?: ReactNode; children: ReactNode }) {
  return (
    <>
      <a className="visually-hidden" href="#main">Skip to main content</a>

      <dui-app-shell data-app-shell="">
        <header>
          <button type="button" aria-controls="app-nav" aria-expanded="true" hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
            Menu
          </button>
          <a href="/" data-link="quiet"><strong>Homebase</strong></a>
          {aux && (
            <button type="button" aria-controls="app-aux" aria-expanded="true" hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M15 4v16"></path></svg>
              Details
            </button>
          )}
          <dui-menu>
            <button type="button" popoverTarget="user-menu">Sam Rivera</button>
            <div id="user-menu" popover="" data-popover="">
              <button type="button">Profile</button>
              <button type="button">Preferences</button>
              <hr />
              <button type="button">Sign out</button>
            </div>
          </dui-menu>
        </header>

        <nav id="app-nav" aria-label="Main" data-nav="vertical">
          <ul>
            {links.map(({ view, href, label, icon }) => (
              <li key={view}>
                <a href={href} aria-current={view === current ? 'page' : undefined}>
                  {icon}
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main" className="stack">{children}</main>

        {aux}

        <footer>
          <p data-text="small muted">Homebase is a domestic-ui demo app. MIT licensed.</p>
        </footer>
      </dui-app-shell>
    </>
  )
}
