import { Suspense } from "react";
import AdminTasksLoading from "@/app/admin/tasks/loading";
import { AdminShell } from "@/components/admin-shell";
import { TaskStatusOverview } from "@/components/task-status-overview";
import { getAdminTasks, requireSessionContext } from "@/lib/ttcs-data";

async function AdminTaskStatusContent() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const tasks = await getAdminTasks(supabase);

  return (
    <AdminShell
      title="Task Status"
      subtitle="Overview of assigned task progress across all users"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <TaskStatusOverview tasks={tasks} />
    </AdminShell>
  );
}

export default function AdminTaskStatusPage() {
  return (
    <Suspense fallback={<AdminTasksLoading />}>
      <AdminTaskStatusContent />
    </Suspense>
  );
}
