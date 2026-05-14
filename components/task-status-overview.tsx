import type { TaskItem } from "@/lib/ttcs-data";

type TaskStatusBucket = "pending" | "delayed" | "completed";

function getTaskBucket(task: TaskItem): TaskStatusBucket {
  if (task.status === "completed") {
    return "completed";
  }

  if (task.isDelayed) {
    return "delayed";
  }

  return "pending";
}

function getTaskBucketLabel(bucket: TaskStatusBucket) {
  return bucket.charAt(0).toUpperCase() + bucket.slice(1);
}

export function TaskStatusOverview({ tasks }: { tasks: TaskItem[] }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const delayedTasks = tasks.filter((task) => task.status !== "completed" && task.isDelayed).length;
  const pendingTasks = tasks.filter((task) => task.status !== "completed" && !task.isDelayed).length;
  const sortedTasks = [...tasks].sort((left, right) => {
    const leftBucket = getTaskBucket(left);
    const rightBucket = getTaskBucket(right);
    const bucketRank = {
      delayed: 0,
      pending: 1,
      completed: 2,
    } as const;

    if (bucketRank[leftBucket] !== bucketRank[rightBucket]) {
      return bucketRank[leftBucket] - bucketRank[rightBucket];
    }

    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;

    if (leftDeadline !== rightDeadline) {
      return leftDeadline - rightDeadline;
    }

    return left.title.localeCompare(right.title);
  });

  const summaryCards = [
    {
      key: "pending",
      label: "Pending",
      count: pendingTasks,
      tone: "pending",
      description: "Tasks still in progress and on track.",
    },
    {
      key: "completed",
      label: "Completed",
      count: completedTasks,
      tone: "completed",
      description: "Finished tasks already marked as done.",
    },
    {
      key: "delayed",
      label: "Delayed",
      count: delayedTasks,
      tone: "delayed",
      description: "Tasks that have passed their deadline.",
    },
  ] as const;

  return (
    <div className="task-status-page-stack">
      <section className="task-status-summary-grid" aria-label="Task status overview">
        {summaryCards.map((card) => (
          <article className={`task-status-summary-card status-${card.tone}`} key={card.key}>
            <span className="task-status-summary-label">{card.label}</span>
            <strong className="task-status-summary-count">{card.count}</strong>
            <p className="task-status-summary-copy">{card.description}</p>
          </article>
        ))}
      </section>

      <section className="page-card task-status-table-card">
        <div className="task-status-table-head">
          <div className="task-status-table-head-copy">
            <h3>Task Status Overview</h3>
            <p>All active tasks with their current status, assignees, and assignment source.</p>
          </div>
          <span className="task-status-pill status-pending">{totalTasks} Active Tasks</span>
        </div>

        {sortedTasks.length ? (
          <div className="table-shell task-status-table-shell">
            <div className="table-row task-status-table-row task-status-table-head-row">
              <span>Task</span>
              <span>Assigned To</span>
              <span>Assigned By</span>
              <span>Status</span>
              <span>Deadline</span>
            </div>

            {sortedTasks.map((task) => {
              const bucket = getTaskBucket(task);

              return (
                <div className="table-row task-status-table-row" key={task.id}>
                  <div className="task-status-table-cell task-status-table-task">
                    <strong>{task.title}</strong>
                    <span>{task.description}</span>
                  </div>

                  <div className="task-status-table-cell task-status-table-assignees">
                    {task.assignees.length ? (
                      task.assignees.map((assignee) => (
                        <span className="task-status-title-chip" key={`${task.id}-${assignee.id}`}>
                          {assignee.fullName}
                        </span>
                      ))
                    ) : (
                      <span className="task-status-title-chip muted">Unassigned</span>
                    )}
                  </div>

                  <div className="task-status-table-cell">
                    <span>{task.createdByLabel}</span>
                  </div>

                  <div className="task-status-table-cell">
                    <span className={`task-status-pill status-${bucket}`}>{getTaskBucketLabel(bucket)}</span>
                  </div>

                  <div className="task-status-table-cell">
                    <span>{task.dueLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="task-empty">No active tasks found.</div>
        )}
      </section>
    </div>
  );
}
