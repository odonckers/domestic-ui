import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

// jsdom (the unit-test DOM) has no ResizeObserver, which <dui-app-shell> uses in browsers to switch
// between sidebars and drawers. These tests check structure, not layout, so a no-op one is enough.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('renders the skip link before the routed view', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.firstElementChild?.matches('a[href="#main"]')).toBe(true);
    expect(compiled.querySelector('a[href="#main"]')?.textContent).toContain('Skip to main content');
  });

  for (const [url, title] of [
    ['/', 'Chores dashboard'],
    ['/settings', 'Account settings'],
    ['/orders', 'Orders'],
  ]) {
    it(`renders ${url} as an app shell with the main navigation`, async () => {
      const harness = await RouterTestingHarness.create(url);
      const shell = harness.routeNativeElement as HTMLElement;
      expect(shell.tagName).toBe('DUI-APP-SHELL');
      expect(shell.hasAttribute('data-app-shell')).toBe(true);
      expect([...shell.children].map((child) => child.tagName).filter((tag) => tag !== 'DIALOG')).toEqual(
        url === '/orders' ? ['HEADER', 'NAV', 'MAIN', 'ASIDE', 'FOOTER'] : ['HEADER', 'NAV', 'MAIN', 'FOOTER'],
      );
      expect(shell.querySelectorAll('nav[aria-label="Main"] a')).toHaveLength(3);
      expect(shell.querySelector('main#main h1')?.textContent?.trim()).toBe(title);
    });
  }
});
