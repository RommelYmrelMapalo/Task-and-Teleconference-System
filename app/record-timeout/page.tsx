import { UserShell } from "@/components/user-shell";

export default function RecordTimeOutPage() {
  return (
    <UserShell title="Dashboard &nbsp;&rsaquo;&nbsp; Record Time-out" subtitle="Close your active meeting attendance logs">
      <div className="form-grid">
        <section className="page-card">
          <h3>Meeting Time-out</h3>
          <p>Confirm your departure time after the meeting ends.</p>
          <div className="form-stack">
            <select className="field-input field-select" defaultValue="capstone">
              <option value="capstone">Capstone checkpoint</option>
              <option value="briefing">Project briefing</option>
            </select>
            <input className="field-input" defaultValue="10:15 AM" />
            <button className="primary-btn" type="button">
              Submit Time-out
            </button>
          </div>
        </section>
      </div>
    </UserShell>
  );
}
