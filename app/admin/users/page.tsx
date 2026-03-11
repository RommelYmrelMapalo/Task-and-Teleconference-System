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
      <div className="table-shell">
        {users.map((user) => (
          <article className="table-row" key={user.id}>
            <div>
              <h3>{user.fullName}</h3>
              <p>{user.email}</p>
              <p>Created {user.createdLabel}</p>
            </div>
            <div className="row-end">
              <span className="soft-badge">{user.roleLabel}</span>
              <span className="soft-badge">Last login: {user.lastLoginLabel}</span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
