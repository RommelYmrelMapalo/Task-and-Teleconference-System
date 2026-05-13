import { Suspense } from "react";
import TasksLoading from "@/app/tasks/loading";
import { UserShell } from "@/components/user-shell";
import { UserTasksBoard } from "@/components/user-tasks-board";
import { getVisibleTasks, requireSessionContext } from "@/lib/ttcs-data";

async function TaskArchiveContent() {
  const { profile, shellUser, unreadCount } = await requireSessionContext();
  const tasks = await getVisibleTasks({ archived: true });

  return (
    <UserShell
      title="Task Archive"
      subtitle="Review tasks retained after 31 days of inactivity"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <UserTasksBoard
        tasks={tasks}
        viewerId={profile.id}
        viewerCanManageAll={shellUser.isAdmin}
        archiveView
      />
    </UserShell>
  );
}

export default function TaskArchivePage() {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TaskArchiveContent />
    </Suspense>
  );
}
