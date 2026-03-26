import { UserShell } from "@/components/user-shell";
import { UserTasksBoard } from "@/components/user-tasks-board";
import TasksLoading from "@/app/tasks/loading";
import { Suspense } from "react";
import { getVisibleTasks, requireSessionContext } from "@/lib/ttcs-data";

async function TasksContent() {
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

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksContent />
    </Suspense>
  );
}
