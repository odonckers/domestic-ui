<script setup>
// The app shell around every view: app bar, main navigation, main, the optional
// auxiliary sidebar (the "aux" slot) and the footer.
import '../../../css/domestic.css'
import '../../../web-components/dui-app-shell.js'
import '../../../web-components/dui-menu.js'

defineProps({ current: { type: String, required: true } })

const links = [
  { view: 'dashboard', href: '/', label: 'Dashboard', paths: ['M3 11.5 12 4l9 7.5M5 10v10h14V10'], circles: [] },
  { view: 'orders', href: '/orders.html', label: 'Orders', paths: ['M3 4h2l2.5 11h11L21 7H6.2'], circles: [[9, 19.5, 1.5], [17, 19.5, 1.5]] },
  { view: 'settings', href: '/settings.html', label: 'Account settings', paths: ['M4 6h10M4 12h4M12 12h8M4 18h12'], circles: [[16, 6, 2], [10, 12, 2], [18, 18, 2]] },
]
</script>

<template>
  <a class="visually-hidden" href="#main">Skip to main content</a>

  <dui-app-shell data-app-shell="">
    <header>
      <button type="button" aria-controls="app-nav" aria-expanded="true" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
        Menu
      </button>
      <a href="/" data-link="quiet"><strong>Homebase</strong></a>
      <button v-if="$slots.aux" type="button" aria-controls="app-aux" aria-expanded="true" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M15 4v16"></path></svg>
        Details
      </button>
      <dui-menu>
        <button type="button" popovertarget="user-menu">Sam Rivera</button>
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
        <li v-for="link in links" :key="link.view">
          <a :href="link.href" :aria-current="link.view === current ? 'page' : undefined">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path v-for="d in link.paths" :key="d" :d="d"></path>
              <circle v-for="[cx, cy, r] in link.circles" :key="`${cx},${cy}`" :cx="cx" :cy="cy" :r="r"></circle>
            </svg>
            {{ link.label }}
          </a>
        </li>
      </ul>
    </nav>

    <main id="main" class="stack"><slot></slot></main>

    <slot name="aux"></slot>

    <footer>
      <p data-text="small muted">Homebase is a domestic-ui demo app. MIT licensed.</p>
    </footer>
  </dui-app-shell>
</template>
