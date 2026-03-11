import { UserShell } from "@/components/user-shell";
import { UserTasksBoard } from "@/components/user-tasks-board";
import { getUserTasks, requireSessionContext } from "@/lib/ttcs-data";

export default async function TasksPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const tasks = await getUserTasks(supabase, profile.id);

  return (
    <UserShell
      title="Tasks Dashboard"
      subtitle="Review your assigned task workload"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <UserTasksBoard tasks={tasks} />
    </UserShell>
  );
}
