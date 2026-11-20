import { APP_BASE_HREF } from '@angular/common';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Base href comes from DI, not a <base> element, so in-page links like the
    // skip link (href="#main") resolve against the current view, not "/".
    { provide: APP_BASE_HREF, useValue: '/' },
  ]
};
