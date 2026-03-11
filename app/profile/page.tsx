import { UserShell } from "@/components/user-shell";

export default function ProfilePage() {
  return (
    <UserShell title="Profile" subtitle="Manage your account information and password">
      <div className="page-grid profile-grid">
        <section className="page-card">
          <h3>Profile Name</h3>
          <div className="form-stack">
            <input className="field-input" defaultValue="Juan" />
            <input className="field-input" defaultValue="Student" />
            <button className="primary-btn" type="button">
              Save Name
            </button>
          </div>
        </section>

        <section className="page-card">
          <h3>Email</h3>
          <div className="form-stack">
            <input className="field-input" defaultValue="juan@student.edu" />
            <input className="field-input" type="password" placeholder="Current password" />
            <button className="primary-btn" type="button">
              Update Email
            </button>
          </div>
        </section>

        <section className="page-card">
          <h3>Password</h3>
          <div className="form-stack">
            <input className="field-input" type="password" placeholder="Current password" />
            <input className="field-input" type="password" placeholder="New password" />
            <input className="field-input" type="password" placeholder="Confirm new password" />
            <button className="primary-btn" type="button">
              Change Password
            </button>
          </div>
        </section>
      </div>
    </UserShell>
  );
}
