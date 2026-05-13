import { Suspense } from "react";
import TasksLoading from "@/app/tasks/loading";
import { UserShell } from "@/components/user-shell";
import { TaskStatusOverview } from "@/components/task-status-overview";
import { getVisibleTasks, requireSessionContext } from "@/lib/ttcs-data";

async function TaskStatusContent() {
  const { shellUser, unreadCount } = await requireSessionContext();
  const tasks = await getVisibleTasks();

  return (
    <UserShell
      title="Task Status"
      subtitle="Overview of assigned task progress across all users"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <TaskStatusOverview tasks={tasks} />
    </UserShell>
  );
}

export default function TaskStatusPage() {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TaskStatusContent />
    </Suspense>
  );
}
