import { AdminShell } from "@/components/admin-shell";
import { getAdminTasks, getAllProfiles, requireSessionContext } from "@/lib/ttcs-data";

export default async function MonitoringPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [tasks, profiles] = await Promise.all([getAdminTasks(supabase), getAllProfiles(supabase)]);

  return (
    <AdminShell
      title="Monitoring Panel"
      subtitle="Recent Supabase-backed account and task activity"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <section className="page-card">
        <h3>Activity Stream</h3>
        <div className="list-stack">
          {profiles.slice(0, 3).map((user) => (
            <article className="table-row" key={user.id}>
              <div>
                <h3>{user.fullName}</h3>
                <p>Last login: {user.lastLoginLabel}</p>
              </div>
              <span className="soft-badge">{user.roleLabel}</span>
            </article>
          ))}
          {tasks.slice(0, 3).map((task) => (
            <article className="table-row" key={task.id}>
              <div>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
              </div>
              <span className="soft-badge">{task.activityLabel}</span>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
