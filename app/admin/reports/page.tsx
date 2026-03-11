import { AdminShell } from "@/components/admin-shell";
import { getAdminTasks, getAllNotifications, getAllProfiles, requireSessionContext } from "@/lib/ttcs-data";

export default async function ReportsPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [tasks, profiles, notifications] = await Promise.all([
    getAdminTasks(supabase),
    getAllProfiles(supabase),
    getAllNotifications(supabase, 500),
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
    </AdminShell>
  );
}
