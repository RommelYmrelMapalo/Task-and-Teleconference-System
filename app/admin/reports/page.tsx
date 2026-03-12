import { AdminShell } from "@/components/admin-shell";
import {
  getAdminTaskAuditLogs,
  getAdminTasks,
  getAllNotifications,
  getAllProfiles,
  requireSessionContext,
} from "@/lib/ttcs-data";

export default async function ReportsPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [tasks, profiles, notifications, auditLogs] = await Promise.all([
    getAdminTasks(supabase),
    getAllProfiles(supabase),
    getAllNotifications(supabase, 500),
    getAdminTaskAuditLogs(supabase, 20),
  ]);

  return (
    <AdminShell
      title="Reports"
      subtitle="Current Supabase-backed summary metrics"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="page-grid three-col">
        <section className="page-card">
          <h3>Task Summary</h3>
          <p>Total tasks: {tasks.length}</p>
          <p>Completed: {tasks.filter((task) => task.status === "completed").length}</p>
          <p>Delayed: {tasks.filter((task) => task.isDelayed).length}</p>
        </section>
        <section className="page-card">
          <h3>Meeting Summary</h3>
          <p>Meeting notices: {notifications.filter((item) => `${item.title} ${item.message}`.toLowerCase().includes("meeting")).length}</p>
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
