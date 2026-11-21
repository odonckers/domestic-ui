import { Component } from '@angular/core';
import { AppBar } from '../shell/app-bar';
import { AppNav } from '../shell/app-nav';

@Component({
  // The page's host element is the app shell itself, so <main> is its direct child as in the
  // other demos (no wrapper element between the shell and its landmarks).
  selector: 'dui-app-shell[app-settings-page]',
  host: { 'data-app-shell': '' },
  imports: [AppBar, AppNav],
  templateUrl: './settings.html',
})
export class SettingsPage {}
