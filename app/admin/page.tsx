import { AdminShell } from "@/components/admin-shell";
import { AdminDashboardCalendar } from "@/components/admin-dashboard-calendar";
import { DashboardSidebarCalendars } from "@/components/dashboard-sidebar-calendars";
import AdminDashboardLoading from "@/app/admin/dashboard-loading";
import { Suspense } from "react";
import { getAdminMeetings } from "@/lib/meeting-data";
import {
  getAdminTasks,
  requireSessionContext,
} from "@/lib/ttcs-data";

async function AdminDashboardContent() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [tasks, meetings] = await Promise.all([
    getAdminTasks(supabase),
    getAdminMeetings(supabase, 100),
  ]);
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

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminDashboardLoading />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
