import { AdminShell } from "@/components/admin-shell";
import {
  getAdminTasks,
  getAllNotifications,
  getAllProfiles,
  getMeetingItems,
  requireSessionContext,
} from "@/lib/ttcs-data";

export default async function AdminDashboardPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [tasks, profiles, notifications] = await Promise.all([
    getAdminTasks(supabase),
    getAllProfiles(supabase),
    getAllNotifications(supabase, 100),
  ]);

  const meetings = getMeetingItems(notifications);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const delayedTasks = tasks.filter((task) => task.isDelayed).length;

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Overview of current workload and account activity"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="stat-grid">
        <section className="page-card stat-card">
          <p>Total Tasks</p>
          <h3>{tasks.length}</h3>
        </section>
        <section className="page-card stat-card">
          <p>Completed Tasks</p>
          <h3>{completedTasks}</h3>
        </section>
        <section className="page-card stat-card">
          <p>Delayed Tasks</p>
          <h3>{delayedTasks}</h3>
        </section>
        <section className="page-card stat-card">
          <p>Active Users</p>
          <h3>{profiles.length}</h3>
        </section>
      </div>

      <div className="page-grid two-col">
        <section className="page-card">
          <div className="card-headline">
            <h3>Recent Tasks</h3>
            <span className="soft-badge">{tasks.length}</span>
          </div>
          <div className="list-stack">
            {tasks.slice(0, 6).map((task) => (
              <article className="mail-item" key={task.id}>
                <div className="mail-item-head">
                  <strong>{task.title}</strong>
                  <span>{task.dueLabel}</span>
                </div>
                <p>{task.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="page-card">
          <div className="card-headline">
            <h3>Meeting Notifications</h3>
            <span className="soft-badge">{meetings.length}</span>
          </div>
          <div className="list-stack">
            {meetings.slice(0, 6).map((meeting) => (
              <article className="mail-item" key={meeting.id}>
                <div className="mail-item-head">
                  <strong>{meeting.title}</strong>
                  <span>{meeting.timeLabel}</span>
                </div>
                <p>{meeting.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
