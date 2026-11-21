import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import '../../../../../web-components/dui-menu.js';

@Component({
  // The host is the app bar <header> itself, a direct child of <dui-app-shell> (no wrapper element).
  // A page projects extra toggles (Details) between the app name and the user menu.
  selector: 'header[app-bar]',
  imports: [RouterLink],
  templateUrl: './app-bar.html',
  // <dui-menu> is a custom element (web-components/dui-menu.js), not an Angular component.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppBar {}
