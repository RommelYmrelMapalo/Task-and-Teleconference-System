import { AdminShell } from "@/components/admin-shell";
import { AdminDashboardCalendar } from "@/components/admin-dashboard-calendar";
import {
  getAdminTasks,
  getAllNotifications,
  getMeetingItems,
  requireSessionContext,
} from "@/lib/ttcs-data";

export default async function AdminDashboardPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [tasks, notifications] = await Promise.all([
    getAdminTasks(supabase),
    getAllNotifications(supabase, 100),
  ]);

  const meetings = getMeetingItems(notifications);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const pendingTasks = tasks.filter((task) => task.status !== "completed" && !task.isDelayed).length;

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Overview of current workload and meeting schedule"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="admin-dashboard-stack">
        <div className="admin-banner-grid">
          <section className="admin-banner">
            <p className="admin-banner-label">Total Tasks</p>
            <h3 className="admin-banner-value">{totalTasks}</h3>
          </section>
          <section className="admin-banner">
            <p className="admin-banner-label">Completed Tasks</p>
            <h3 className="admin-banner-value">{completedTasks}</h3>
          </section>
          <section className="admin-banner">
            <p className="admin-banner-label">Pending Tasks</p>
            <h3 className="admin-banner-value">{pendingTasks}</h3>
          </section>
          <section className="admin-banner">
            <p className="admin-banner-label">Meetings</p>
            <h3 className="admin-banner-value">{meetings.length}</h3>
          </section>
        </div>
        <AdminDashboardCalendar tasks={tasks} meetings={meetings} />
      </div>
    </AdminShell>
  );
}
