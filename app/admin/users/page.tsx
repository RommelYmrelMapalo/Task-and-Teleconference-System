import { AdminShell } from "@/components/admin-shell";
import { getAllProfiles, requireSessionContext } from "@/lib/ttcs-data";

export default async function AdminUsersPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const users = await getAllProfiles(supabase);

  return (
    <AdminShell
      title="Manage Users"
      subtitle="Review profiles stored in Supabase"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="table-shell users-table-shell">
        <div className="table-row users-table-row users-table-head" role="row">
          <div className="users-table-cell" role="columnheader">
            Name
          </div>
          <div className="users-table-cell" role="columnheader">
            Email
          </div>
          <div className="users-table-cell" role="columnheader">
            Created At
          </div>
          <div className="users-table-cell" role="columnheader">
            Role
          </div>
          <div className="users-table-cell" role="columnheader">
            Last Login
          </div>
        </div>
        {users.map((user) => (
          <article className="table-row users-table-row" key={user.id} role="row">
            <div className="users-table-cell users-table-value" role="cell">
              {user.fullName}
            </div>
            <div className="users-table-cell users-table-value" role="cell">
              {user.email}
            </div>
            <div className="users-table-cell users-table-value" role="cell">
              {user.createdLabel}
            </div>
            <div className="users-table-cell" role="cell">
              <span className="soft-badge">{user.roleLabel}</span>
            </div>
            <div className="users-table-cell" role="cell">
              <span className="soft-badge">{user.lastLoginLabel}</span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
