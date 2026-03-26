import { AdminShell } from "@/components/admin-shell";
import { UserTasksBoard } from "@/components/user-tasks-board";
import AdminTasksLoading from "@/app/admin/tasks/loading";
import { Suspense } from "react";
import { getAdminTasks, getAllProfiles, requireSessionContext } from "@/lib/ttcs-data";

async function AdminTasksContent() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [tasks, users] = await Promise.all([getAdminTasks(supabase), getAllProfiles(supabase)]);

  return (
    <AdminShell
      title="Manage Tasks"
      subtitle="Review task records and assignees stored in Supabase"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <UserTasksBoard
        tasks={tasks}
        viewerId={profile.id}
        viewerCanManageAll
        variant="admin"
        assignableUsers={users}
      />
    </AdminShell>
  );
}

export default function AdminTasksPage() {
  return (
    <Suspense fallback={<AdminTasksLoading />}>
      <AdminTasksContent />
    </Suspense>
  );
}
