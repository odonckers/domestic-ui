import type { CSSProperties } from 'react'
import Layout from './Layout.tsx'

const summary = [
  { title: 'Due today', count: 3 },
  { title: 'Overdue', count: 1 },
  { title: 'Done this week', count: 12 },
  { title: 'Household members', count: 4 },
]

const chores = [
  { chore: 'Empty the dishwasher', room: 'Kitchen', assignee: 'Sam', date: '2026-11-20', due: 'Today' },
  { chore: 'Water the plants', room: 'Living room', assignee: 'Alex', date: '2026-11-20', due: 'Today' },
  { chore: 'Take out recycling', room: 'Garden', assignee: 'Jordan', date: '2026-11-20', due: 'Today' },
  { chore: 'Clean the bathroom', room: 'Bathroom', assignee: 'Riley', date: '2026-11-22', due: 'Sunday 22 November' },
  { chore: 'Vacuum the stairs', room: 'Living room', assignee: 'Sam', date: '2026-11-24', due: 'Tuesday 24 November' },
]

export default function DashboardPage() {
  return (
    <Layout current="dashboard">
      <h1>Chores dashboard</h1>
      <p>What needs doing around the house this week, and who is on it.</p>

      <div className="grid" style={{ '--grid-min': '12rem' } as CSSProperties}>
        {summary.map(({ title, count }) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{count}</p>
          </article>
        ))}
      </div>

      <section aria-labelledby="upcoming-title">
        <h2 id="upcoming-title">Upcoming chores</h2>

        <details>
          <summary>Filter</summary>
          <form className="stack" method="get">
            <div>
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
              <button type="submit">Apply filter</button>
            </div>
          </form>
        </details>

        <table>
          <caption>Chores due in the next seven days</caption>
          <thead>
            <tr>
              <th scope="col">Chore</th>
              <th scope="col">Room</th>
              <th scope="col">Assigned to</th>
              <th scope="col">Due</th>
            </tr>
          </thead>
          <tbody>
            {chores.map(({ chore, room, assignee, date, due }) => (
              <tr key={chore}>
                <th scope="row">{chore}</th>
                <td>{room}</td>
                <td>{assignee}</td>
                <td><time dateTime={date}>{due}</time></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cluster">
          <button type="button">Add chore</button>
          <button type="button">Swap a chore</button>
          <button type="button">Print this week</button>
        </div>
      </section>
    </Layout>
  )
}
