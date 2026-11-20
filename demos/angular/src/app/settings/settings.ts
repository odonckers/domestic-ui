import { Component } from '@angular/core';

@Component({
  // The page's host element is the <main> landmark itself, so the markup matches
  // the other demos (no wrapper element between <main> and its content).
  selector: 'main[app-settings-page]',
  host: { id: 'main' },
  templateUrl: './settings.html',
})
export class SettingsPage {}
