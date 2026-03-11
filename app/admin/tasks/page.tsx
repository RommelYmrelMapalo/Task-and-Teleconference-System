import { AdminShell } from "@/components/admin-shell";
import { userTasks } from "@/lib/mock-data";

export default function AdminTasksPage() {
  return (
    <AdminShell title="Manage Tasks" subtitle="Review and organize all task records">
      <div className="page-stack">
        <div className="toolbar-card">
          <input className="field-input" placeholder="Search tasks" />
          <select className="field-input field-select" defaultValue="all">
            <option value="all">All sections</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <button className="primary-btn" type="button">
            New Task
          </button>
        </div>

        <div className="table-shell">
          {userTasks.map((task) => (
            <article className="table-row" key={task.id}>
              <div>
                <h3>{task.title}</h3>
                <p>{task.due}</p>
              </div>
              <span className="soft-badge">{task.status}</span>
            </article>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
