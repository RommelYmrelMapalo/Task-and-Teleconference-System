import { AdminShell } from "@/components/admin-shell";
import { getAdminTasks, requireSessionContext } from "@/lib/ttcs-data";

function statusLabel(task: { status: string; isDelayed: boolean }) {
  if (task.status === "completed") {
    return "Completed";
  }

  if (task.isDelayed) {
    return "Delayed";
  }

  if (task.status === "for_revision") {
    return "For Revision";
  }

  return task.status === "assigned" ? "Assigned" : "In Progress";
}

export default async function AdminTasksPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const tasks = await getAdminTasks(supabase);

  return (
    <AdminShell
      title="Manage Tasks"
      subtitle="Review task records and assignees stored in Supabase"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="table-shell">
        {tasks.length ? (
          tasks.map((task) => (
            <article className="table-row" key={task.id}>
              <div>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <p>Assignees: {task.assignees.length ? task.assignees.map((assignee) => assignee.fullName).join(", ") : "Unassigned"}</p>
              </div>
              <div className="row-end">
                <span className="soft-badge">{statusLabel(task)}</span>
                <span className="soft-badge">{task.priority.toUpperCase()}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="task-empty">No tasks found.</div>
        )}
      </div>
    </AdminShell>
  );
}
