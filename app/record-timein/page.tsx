import { UserShell } from "@/components/user-shell";

export default function RecordTimeInPage() {
  return (
    <UserShell title="Dashboard &nbsp;&rsaquo;&nbsp; Record Time-in" subtitle="Register your attendance for assigned meetings">
      <div className="form-grid">
        <section className="page-card">
          <h3>Meeting Time-in</h3>
          <p>Select your assigned meeting and confirm your arrival time.</p>
          <div className="form-stack">
            <select className="field-input field-select" defaultValue="capstone">
              <option value="capstone">Capstone checkpoint</option>
              <option value="briefing">Project briefing</option>
            </select>
            <input className="field-input" defaultValue="08:45 AM" />
            <button className="primary-btn" type="button">
              Submit Time-in
            </button>
          </div>
        </section>
      </div>
    </UserShell>
  );
}
