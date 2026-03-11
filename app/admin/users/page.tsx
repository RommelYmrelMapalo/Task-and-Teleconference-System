import { AdminShell } from "@/components/admin-shell";
import { adminUsers } from "@/lib/mock-data";

export default function AdminUsersPage() {
  return (
    <AdminShell title="Manage Users" subtitle="Review user accounts and roles">
      <div className="table-shell">
        {adminUsers.map((user) => (
          <article className="table-row" key={user.id}>
            <div>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </div>
            <div className="row-end">
              <span className="soft-badge">{user.role}</span>
              <span className="soft-badge">{user.status}</span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
