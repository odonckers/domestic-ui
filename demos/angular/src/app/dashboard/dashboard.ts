import { Component } from '@angular/core';

@Component({
  // The page's host element is the <main> landmark itself, so the markup matches
  // the other demos (no wrapper element between <main> and its content).
  selector: 'main[app-dashboard-page]',
  host: { id: 'main' },
  templateUrl: './dashboard.html',
})
export class DashboardPage {
  protected readonly summary = [
    { title: 'Due today', count: 3 },
    { title: 'Overdue', count: 1 },
    { title: 'Done this week', count: 12 },
    { title: 'Household members', count: 4 },
  ];

  protected readonly chores = [
    { chore: 'Empty the dishwasher', room: 'Kitchen', assignee: 'Sam', date: '2026-11-20', due: 'Today' },
    { chore: 'Water the plants', room: 'Living room', assignee: 'Alex', date: '2026-11-20', due: 'Today' },
    { chore: 'Take out recycling', room: 'Garden', assignee: 'Jordan', date: '2026-11-20', due: 'Today' },
    { chore: 'Clean the bathroom', room: 'Bathroom', assignee: 'Riley', date: '2026-11-22', due: 'Sunday 22 November' },
    { chore: 'Vacuum the stairs', room: 'Living room', assignee: 'Sam', date: '2026-11-24', due: 'Tuesday 24 November' },
  ];
}
