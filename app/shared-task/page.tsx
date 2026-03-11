import { UserShell } from "@/components/user-shell";
import { getUserTasks, requireSessionContext } from "@/lib/ttcs-data";

export default async function SharedTaskPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const tasks = await getUserTasks(supabase, profile.id);
  const task = tasks[0];

  return (
    <UserShell
      title="Shared Task"
      subtitle="Preview the latest task currently available to your account"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <section className="page-card">
        {task ? (
          <>
            <h3>{task.title}</h3>
            <p>Priority: {task.priority.toUpperCase()}</p>
            <p>Due: {task.dueLabel}</p>
            <p>{task.description}</p>
          </>
        ) : (
          <>
            <h3>No task available</h3>
            <p>A dedicated dynamic shared-task route still needs to be added if you want public task links.</p>
          </>
        )}
      </section>
    </UserShell>
  );
}
