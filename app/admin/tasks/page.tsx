import { AdminShell } from "@/components/admin-shell";
import { UserTasksBoard } from "@/components/user-tasks-board";
import { getAdminTasks, getAllProfiles, requireSessionContext } from "@/lib/ttcs-data";

export default async function AdminTasksPage() {
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
