import { UserShell } from "@/components/user-shell";
import { UserTasksBoard } from "@/components/user-tasks-board";
import { getVisibleTasks, requireSessionContext } from "@/lib/ttcs-data";

export default async function TasksPage() {
  const { profile, shellUser, unreadCount } = await requireSessionContext();
  const tasks = await getVisibleTasks();

  return (
    <UserShell
      title="Tasks Dashboard"
      subtitle="Review all tasks currently visible in the system"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <UserTasksBoard tasks={tasks} viewerId={profile.id} viewerCanManageAll={shellUser.isAdmin} />
    </UserShell>
  );
}
