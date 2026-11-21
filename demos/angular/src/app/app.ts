import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// Defines <dui-app-shell>, the host element of every routed page.
import '../../../../web-components/dui-app-shell.js';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
