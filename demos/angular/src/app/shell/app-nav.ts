import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  // The host is the main navigation <nav> itself, a direct child of <dui-app-shell> (no wrapper element).
  selector: 'nav[app-nav]',
  host: { id: 'app-nav', 'aria-label': 'Main', 'data-nav': 'vertical' },
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-nav.html',
})
export class AppNav {}
