import { AdminShell } from "@/components/admin-shell";
import {
  getAdminTaskAuditLogs,
  getAdminTasks,
  getAllNotifications,
  getAllProfiles,
  requireSessionContext,
} from "@/lib/ttcs-data";

export default async function MonitoringPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [tasks, profiles, notifications, auditLogs] = await Promise.all([
    getAdminTasks(supabase),
    getAllProfiles(supabase),
    getAllNotifications(supabase, 500),
    getAdminTaskAuditLogs(supabase, 20),
  ]);

  return (
    <AdminShell
      title="Monitoring Panel"
      subtitle="Recent Supabase-backed account activity and reports"
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

      <div className="page-grid three-col">
        <section className="page-card">
          <h3>Task Summary</h3>
          <p>Total tasks: {tasks.length}</p>
          <p>Completed: {tasks.filter((task) => task.status === "completed").length}</p>
          <p>Delayed: {tasks.filter((task) => task.isDelayed).length}</p>
        </section>
        <section className="page-card">
          <h3>Meeting Summary</h3>
          <p>
            Meeting notices:{" "}
            {
              notifications.filter((item) =>
                `${item.title} ${item.message}`.toLowerCase().includes("meeting")
              ).length
            }
          </p>
          <p>Unread notices: {notifications.filter((item) => !item.isRead).length}</p>
        </section>
        <section className="page-card">
          <h3>User Activity</h3>
          <p>Total profiles: {profiles.length}</p>
          <p>Admins: {profiles.filter((profile) => profile.isAdmin).length}</p>
          <p>Users: {profiles.filter((profile) => !profile.isAdmin).length}</p>
        </section>
      </div>

      <section className="page-card">
        <div className="card-headline">
          <h3>Task Override Logs</h3>
          <span className="soft-badge">{auditLogs.length}</span>
        </div>
        <div className="list-stack">
          {auditLogs.length ? (
            auditLogs.map((log) => (
              <article className="table-row" key={log.id}>
                <div>
                  <h3>{log.action}</h3>
                  <p>User: {log.actorName}</p>
                  <p>Task: {log.taskTitle}</p>
                  <p>{log.details}</p>
                </div>
                <span className="soft-badge">{log.createdLabel}</span>
              </article>
            ))
          ) : (
            <p>No override edits have been logged.</p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
