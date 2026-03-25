import { UserShell } from "@/components/user-shell";
import { DashboardPlanner, DashboardPlannerActions } from "@/components/dashboard-planner";
import DashboardLoading from "@/app/dashboard/loading";
import { Suspense } from "react";
import {
  getVisibleTasks,
  getMeetingItems,
  getUserNotifications,
  requireSessionContext,
} from "@/lib/ttcs-data";

async function DashboardContent() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const [tasks, notifications] = await Promise.all([
    getVisibleTasks(),
    getUserNotifications(supabase, profile.id, 30),
  ]);

  const meetings = getMeetingItems(notifications);

  return (
    <UserShell
      title="Dashboard"
      subtitle="Overview of visible tasks and meeting updates"
      user={shellUser}
      unreadCount={unreadCount}
      actions={<DashboardPlannerActions />}
    >
      <DashboardPlanner
        tasks={tasks}
        meetings={meetings}
        viewerId={profile.id}
        viewerCanManageAll={shellUser.isAdmin}
      />
    </UserShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
