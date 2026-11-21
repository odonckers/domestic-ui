import { Component } from '@angular/core';
import { AppBar } from '../shell/app-bar';
import { AppNav } from '../shell/app-nav';

@Component({
  // The page's host element is the app shell itself, so <main> is its direct child as in the
  // other demos (no wrapper element between the shell and its landmarks).
  selector: 'dui-app-shell[app-dashboard-page]',
  host: { 'data-app-shell': '' },
  imports: [AppBar, AppNav],
  templateUrl: './dashboard.html',
})
export class DashboardPage {
  protected readonly summary: { id: string; title: string; count: number; note?: string }[] = [
    { id: 'due-today', title: 'Due today', count: 2 },
    { id: 'overdue', title: 'Overdue', count: 1 },
    { id: 'done-this-week', title: 'Done this week', count: 12, note: 'Since Monday' },
    { id: 'members', title: 'Household members', count: 4 },
  ];

  protected readonly chores = [
    { chore: 'Take out recycling', room: 'Garden', assignee: 'Jordan', date: '2026-11-19', due: 'Yesterday', status: 'Overdue', tone: 'danger' },
    { chore: 'Empty the dishwasher', room: 'Kitchen', assignee: 'Sam', date: '2026-11-20', due: 'Today', status: 'Done', tone: 'success' },
    { chore: 'Water the plants', room: 'Living room', assignee: 'Alex', date: '2026-11-20', due: 'Today', status: 'Due today', tone: 'warning' },
    { chore: 'Clean the bathroom', room: 'Bathroom', assignee: 'Riley', date: '2026-11-22', due: 'Sunday 22 November', status: 'Scheduled', tone: 'neutral' },
    { chore: 'Vacuum the stairs', room: 'Living room', assignee: 'Sam', date: '2026-11-24', due: 'Tuesday 24 November', status: 'Scheduled', tone: 'neutral' },
  ];
}
