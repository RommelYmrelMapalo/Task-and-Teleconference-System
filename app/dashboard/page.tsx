import { UserShell } from "@/components/user-shell";
import { DashboardPlanner, DashboardPlannerActions } from "@/components/dashboard-planner";
import {
  getMeetingItems,
  getUserNotifications,
  getUserTasks,
  requireSessionContext,
} from "@/lib/ttcs-data";

export default async function DashboardPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const [tasks, notifications] = await Promise.all([
    getUserTasks(supabase, profile.id),
    getUserNotifications(supabase, profile.id, 30),
  ]);

  const meetings = getMeetingItems(notifications);

  return (
    <UserShell
      title="Dashboard"
      subtitle="Overview of your assigned tasks and meeting updates"
      user={shellUser}
      unreadCount={unreadCount}
      actions={<DashboardPlannerActions />}
    >
      <DashboardPlanner tasks={tasks} meetings={meetings} />
    </UserShell>
  );
}
