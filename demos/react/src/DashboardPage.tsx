import type { CSSProperties } from 'react'
import Layout from './Layout.tsx'

const summary: { title: string; count: number; note?: string }[] = [
  { title: 'Due today', count: 2 },
  { title: 'Overdue', count: 1 },
  { title: 'Done this week', count: 12, note: 'Since Monday' },
  { title: 'Household members', count: 4 },
]

const chores = [
  { chore: 'Take out recycling', room: 'Garden', assignee: 'Jordan', date: '2026-11-19', due: 'Yesterday', status: 'Overdue', tone: 'danger' },
  { chore: 'Empty the dishwasher', room: 'Kitchen', assignee: 'Sam', date: '2026-11-20', due: 'Today', status: 'Done', tone: 'success' },
  { chore: 'Water the plants', room: 'Living room', assignee: 'Alex', date: '2026-11-20', due: 'Today', status: 'Due today', tone: 'warning' },
  { chore: 'Clean the bathroom', room: 'Bathroom', assignee: 'Riley', date: '2026-11-22', due: 'Sunday 22 November', status: 'Scheduled', tone: 'neutral' },
  { chore: 'Vacuum the stairs', room: 'Living room', assignee: 'Sam', date: '2026-11-24', due: 'Tuesday 24 November', status: 'Scheduled', tone: 'neutral' },
]

export default function DashboardPage() {
  return (
    <Layout current="dashboard">
      <h1>Chores dashboard</h1>
      <p data-text="lead">What needs doing around the house this week, and who is on it.</p>

      <div className="grid" style={{ '--grid-min': '12rem' } as CSSProperties}>
        {summary.map(({ title, count, note }) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{count}</p>
            {note && <p data-text="small muted">{note}</p>}
          </article>
        ))}
      </div>

      <section aria-labelledby="upcoming-title">
        <h2 id="upcoming-title">Upcoming chores</h2>

        <details>
          <summary>Filter</summary>
          <form className="stack" method="get">
            <div data-field="">
              <label htmlFor="filter-room">Room</label>
              <select id="filter-room" name="room" defaultValue="all">
                <option value="all">All rooms</option>
                <option value="kitchen">Kitchen</option>
                <option value="bathroom">Bathroom</option>
                <option value="living-room">Living room</option>
                <option value="garden">Garden</option>
              </select>
            </div>
            <fieldset>
              <legend>Show</legend>
              <label><input type="checkbox" name="mine" /> Only chores assigned to me</label>
              <label><input type="checkbox" name="completed" /> Completed chores</label>
            </fieldset>
            <div className="cluster">
              <button type="submit" data-button="small">Apply filter</button>
            </div>
          </form>
        </details>

        <table>
          <caption>Chores this week</caption>
          <thead>
            <tr>
              <th scope="col">Chore</th>
              <th scope="col">Room</th>
              <th scope="col">Assigned to</th>
              <th scope="col">Due</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {chores.map(({ chore, room, assignee, date, due, status, tone }) => (
              <tr key={chore}>
                <th scope="row">{chore}</th>
                <td>{room}</td>
                <td>{assignee}</td>
                <td><time dateTime={date}>{due}</time></td>
                <td><span data-badge={tone}>{status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cluster">
          <button type="button" data-button="primary">Add chore</button>
          <button type="button" data-button="secondary">Swap a chore</button>
          <button type="button" data-button="quiet">Print this week</button>
        </div>
      </section>
    </Layout>
  )
}
