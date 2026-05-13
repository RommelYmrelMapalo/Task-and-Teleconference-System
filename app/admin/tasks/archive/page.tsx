import { Suspense } from "react";
import AdminTasksLoading from "@/app/admin/tasks/loading";
import { AdminShell } from "@/components/admin-shell";
import { UserTasksBoard } from "@/components/user-tasks-board";
import { getAdminTasks, requireSessionContext } from "@/lib/ttcs-data";

async function AdminTaskArchiveContent() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const tasks = await getAdminTasks(supabase, { archived: true });

  return (
    <AdminShell
      title="Task Archive"
      subtitle="Review archived task records kept after 31 days of inactivity"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <UserTasksBoard
        tasks={tasks}
        viewerId={profile.id}
        viewerCanManageAll
        variant="admin"
        archiveView
      />
    </AdminShell>
  );
}

export default function AdminTaskArchivePage() {
  return (
    <Suspense fallback={<AdminTasksLoading />}>
      <AdminTaskArchiveContent />
    </Suspense>
  );
}
