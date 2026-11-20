import type { CSSProperties } from 'react'
import Layout from './Layout.tsx'

export default function SettingsPage() {
  return (
    <Layout current="settings">
      <h1>Account settings</h1>
      <p>Update your profile and choose how Homebase keeps you in the loop.</p>

      <form className="stack" style={{ '--stack-gap': 'var(--dui-space-l)' } as CSSProperties} method="get">
        <fieldset>
          <legend>Profile</legend>
          <div className="grid" style={{ '--grid-min': '14rem' } as CSSProperties}>
            <div>
              <label htmlFor="given-name">First name</label>
              <input id="given-name" name="given-name" type="text" autoComplete="given-name" />
            </div>
            <div>
              <label htmlFor="family-name">Last name</label>
              <input id="family-name" name="family-name" type="text" autoComplete="family-name" />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="tel">Phone</label>
              <input id="tel" name="tel" type="tel" autoComplete="tel" />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Region</legend>
          <div className="grid" style={{ '--grid-min': '14rem' } as CSSProperties}>
            <div>
              <label htmlFor="language">Language</label>
              <select id="language" name="language" autoComplete="language" defaultValue="en">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="nl">Nederlands</option>
              </select>
            </div>
            <div>
              <label htmlFor="time-zone">Time zone</label>
              <select id="time-zone" name="time-zone" defaultValue="America/Chicago">
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/New_York">Eastern Time</option>
              </select>
            </div>
          </div>
        </fieldset>

        <div className="grid" style={{ '--grid-min': '14rem' } as CSSProperties}>
          <fieldset>
            <legend>Email me</legend>
            <label><input type="radio" name="frequency" value="immediately" /> Right away</label>
            <label><input type="radio" name="frequency" value="daily" defaultChecked /> Once a day</label>
            <label><input type="radio" name="frequency" value="weekly" /> Once a week</label>
            <label><input type="radio" name="frequency" value="never" /> Never</label>
          </fieldset>
          <fieldset>
            <legend>Notify me about</legend>
            <label><input type="checkbox" name="notify-assigned" defaultChecked /> Chores assigned to me</label>
            <label><input type="checkbox" name="notify-overdue" defaultChecked /> Overdue chores</label>
            <label><input type="checkbox" name="notify-members" /> New household members</label>
          </fieldset>
        </div>

        <fieldset>
          <legend>About you</legend>
          <label htmlFor="bio">Note for your household</label>
          <textarea id="bio" name="bio" rows={3} maxLength={200} aria-describedby="bio-hint" />
          <small id="bio-hint">Shown on the household page. Up to 200 characters.</small>
        </fieldset>

        <div className="cluster">
          <button type="submit">Save changes</button>
          <button type="reset">Reset</button>
        </div>
      </form>
    </Layout>
  )
}
