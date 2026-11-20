import { Routes } from '@angular/router';
import { DashboardPage } from './dashboard/dashboard';
import { SettingsPage } from './settings/settings';

export const routes: Routes = [
  { path: '', component: DashboardPage, title: 'Dashboard · Homebase' },
  { path: 'settings', component: SettingsPage, title: 'Account settings · Homebase' },
  { path: '**', redirectTo: '' },
];
