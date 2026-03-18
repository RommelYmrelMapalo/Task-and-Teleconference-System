import { AdminShell } from "@/components/admin-shell";
import { AdminDashboardCalendar } from "@/components/admin-dashboard-calendar";
import { DashboardSidebarCalendars } from "@/components/dashboard-sidebar-calendars";
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
  const delayedTasks = tasks.filter((task) => task.status !== "completed" && task.isDelayed).length;

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Overview of current workload and meeting schedule"
      user={shellUser}
      unreadCount={unreadCount}
      sidebarContent={<DashboardSidebarCalendars tasks={tasks} />}
    >
      <div className="admin-dashboard-stack">
        <AdminDashboardCalendar
          tasks={tasks}
          meetings={meetings}
          totalTasks={totalTasks}
          completedTasks={completedTasks}
          pendingTasks={pendingTasks}
          delayedTasks={delayedTasks}
          meetingCount={meetings.length}
        />
      </div>
    </AdminShell>
  );
}
