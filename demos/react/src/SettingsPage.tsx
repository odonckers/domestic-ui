import Layout from './Layout.tsx'

export default function SettingsPage() {
  return (
    <Layout current="settings">
      <h1 id="settings-title">Account settings</h1>
      <p data-text="lead">Update your profile and choose how Homebase keeps you in the loop.</p>

      <form data-form-sections="" aria-labelledby="settings-title" method="get">
        <section aria-labelledby="profile-title">
          <header>
            <h2 id="profile-title">Profile</h2>
            <p>Your name and how the household can reach you.</p>
          </header>
          <div>
            <div data-field="">
              <label htmlFor="given-name">First name</label>
              <input id="given-name" name="given-name" type="text" autoComplete="given-name" />
            </div>
            <div data-field="">
              <label htmlFor="family-name">Last name</label>
              <input id="family-name" name="family-name" type="text" autoComplete="family-name" />
            </div>
            <div data-field="">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" />
            </div>
            <div data-field="">
              <label htmlFor="tel">Phone</label>
              <input id="tel" name="tel" type="tel" autoComplete="tel" />
            </div>
          </div>
        </section>
        <section aria-labelledby="region-title">
          <header>
            <h2 id="region-title">Region</h2>
            <p>The language and time zone Homebase shows you.</p>
          </header>
          <div>
            <div data-field="">
              <label htmlFor="language">Language</label>
              <select id="language" name="language" autoComplete="language" defaultValue="en">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="nl">Nederlands</option>
              </select>
            </div>
            <div data-field="">
              <label htmlFor="time-zone">Time zone</label>
              <select id="time-zone" name="time-zone" defaultValue="America/Chicago">
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/New_York">Eastern Time</option>
              </select>
            </div>
          </div>
        </section>
        <section aria-labelledby="email-me-title">
          <header>
            <h2 id="email-me-title">Email me</h2>
            <p>How often Homebase sends you a summary by email.</p>
          </header>
          <div>
            <fieldset>
              <legend>Email me</legend>
              <label><input type="radio" name="frequency" value="immediately" /> Right away</label>
              <label><input type="radio" name="frequency" value="daily" defaultChecked /> Once a day</label>
              <label><input type="radio" name="frequency" value="weekly" /> Once a week</label>
              <label><input type="radio" name="frequency" value="never" /> Never</label>
            </fieldset>
          </div>
        </section>
        <section aria-labelledby="notify-title">
          <header>
            <h2 id="notify-title">Notify me about</h2>
            <p>Which changes in the household Homebase tells you about.</p>
          </header>
          <div>
            <fieldset>
              <legend>Notify me about</legend>
              <label><input type="checkbox" role="switch" name="notify-assigned" defaultChecked /> Chores assigned to me</label>
              <label><input type="checkbox" role="switch" name="notify-overdue" defaultChecked /> Overdue chores</label>
              <label><input type="checkbox" role="switch" name="notify-members" /> New household members</label>
            </fieldset>
          </div>
        </section>
        <section aria-labelledby="about-title">
          <header>
            <h2 id="about-title">About you</h2>
            <p>A short note the rest of your household can read.</p>
          </header>
          <div>
            <div data-field="">
              <label htmlFor="bio">Note for your household</label>
              <textarea id="bio" name="bio" rows={3} maxLength={200} aria-describedby="bio-hint" />
              <p id="bio-hint" data-field="hint">Shown on the household page. Up to 200 characters.</p>
            </div>
          </div>
        </section>
        <footer data-action-bar="">
          <button type="submit" data-button="primary">Save changes</button>
          <button type="reset" data-button="quiet">Reset</button>
        </footer>
      </form>
    </Layout>
  )
}
