import { AdminShell } from "@/components/admin-shell";

export default function AdminProfilePage() {
  return (
    <AdminShell title="Profile" subtitle="Manage administrative account details">
      <div className="page-grid profile-grid">
        <section className="page-card">
          <h3>Admin Profile</h3>
          <div className="form-stack">
            <input className="field-input" defaultValue="Admin" />
            <input className="field-input" defaultValue="User" />
            <input className="field-input" defaultValue="admin@ttcs.local" />
          </div>
        </section>
        <section className="page-card">
          <h3>Security</h3>
          <div className="form-stack">
            <input className="field-input" type="password" placeholder="Current password" />
            <input className="field-input" type="password" placeholder="New password" />
            <button className="primary-btn" type="button">
              Save Changes
            </button>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
