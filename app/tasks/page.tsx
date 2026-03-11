"use client";

import { UserShell } from "@/components/user-shell";
import { taskDashboardItems, type TaskDashboardItem } from "@/lib/mock-data";
import { useEffect, useMemo, useState } from "react";

type TaskFilter = "all" | "active" | "revision" | "completed" | "delayed";
type MutableTaskItem = TaskDashboardItem & {
  originalStatus: Exclude<TaskDashboardItem["status"], "completed">;
};

function matchesFilter(task: TaskDashboardItem, filter: TaskFilter) {
  if (filter === "all") return true;
  if (filter === "active") return task.status === "in_progress";
  if (filter === "revision") return task.status === "for_revision";
  if (filter === "completed") return task.status === "completed";
  return task.status === "delayed";
}

function statusClass(status: TaskDashboardItem["status"]) {
  if (status === "completed") return "st-completed";
  if (status === "for_revision") return "st-revision";
  if (status === "delayed") return "st-delayed";
  return "st-pending";
}

function statusLabel(status: TaskDashboardItem["status"]) {
  if (status === "in_progress") return "PENDING";
  if (status === "for_revision") return "FOR REVISION";
  if (status === "completed") return "COMPLETED";
  return "DELAYED";
}

const sectionOrder: Array<{
  key: Exclude<TaskFilter, "all" | "delayed">;
  title: string;
  dotClass: string;
}> = [
  { key: "active", title: "Active Tasks", dotClass: "badge-active" },
  { key: "revision", title: "For Revision", dotClass: "badge-revision" },
  { key: "completed", title: "Completed Tasks", dotClass: "badge-done" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<MutableTaskItem[]>(() =>
    taskDashboardItems.map((task) => ({
      ...task,
      originalStatus: task.status === "completed" ? "in_progress" : task.status,
    })),
  );
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "normal" | "low">("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    active: true,
    revision: true,
    completed: true,
  });

  useEffect(() => {
    if (!taskModalOpen) return;
    const timeout = window.setTimeout(() => setTaskModalOpen(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [taskModalOpen]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((task) => task.status === "in_progress").length,
      revision: tasks.filter((task) => task.status === "for_revision").length,
      completed: tasks.filter((task) => task.status === "completed").length,
      delayed: tasks.filter((task) => task.status === "delayed").length,
    }),
    [tasks],
  );

  const visibleItems = useMemo(() => {
    return tasks.filter((task) => {
      const query = `${task.title} ${task.description}`.toLowerCase();
      const okSearch = !search.trim() || query.includes(search.trim().toLowerCase());
      const okPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const okFilter = matchesFilter(task, activeFilter);
      return okSearch && okPriority && okFilter;
    });
  }, [activeFilter, priorityFilter, search, tasks]);

  const sectionItems = useMemo(
    () => ({
      active: visibleItems.filter((task) => task.status === "in_progress"),
      revision: visibleItems.filter((task) => task.status === "for_revision"),
      completed: visibleItems.filter((task) => task.status === "completed"),
    }),
    [visibleItems],
  );

  const recentItems = useMemo(() => tasks.slice(0, 5), [tasks]);

  const toggleTask = (taskId: number) => {
    setTasks((current) =>
      current.map((task) =>
        task.id !== taskId
          ? task
          : {
              ...task,
              status: task.status === "completed" ? task.originalStatus : "completed",
            },
      ),
    );
  };

  return (
    <UserShell title="Dashboard &nbsp;&rsaquo;&nbsp; Tasks" subtitle="Manage and track your assigned tasks">
      <div className="taskdash-wrap">
        {taskModalOpen ? (
          <div className="modal-overlay show autoModal">
            <div className="modal-popup success modern-popup" role="status" aria-live="polite">
              <div className="modal-icon-wrap">
                <div className="modal-icon" aria-hidden="true">
                  {"\u2713"}
                </div>
              </div>
              <div className="modal-text">Task created!</div>
              <div className="modal-subtext">Your new task was published successfully.</div>
              <div className="modal-progress" aria-hidden="true" />
            </div>
          </div>
        ) : null}

        <div className="td-pills">
          {([
            ["all", "All Tasks"],
            ["active", "Active"],
            ["revision", "For Revision"],
            ["completed", "Completed"],
            ["delayed", "Delayed"],
          ] as Array<[TaskFilter, string]>).map(([key, label]) => (
            <button
              key={key}
              className={`pill-tab${activeFilter === key ? " active" : ""}`}
              type="button"
              onClick={() => setActiveFilter(key)}
            >
              {label}
              <span className="pill-count">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="td-toolbar taskdash-toolbar">
          <select
            className="field-input field-select td-filter"
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value as "all" | "high" | "normal" | "low")
            }
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <input
            className="field-input td-search"
            placeholder="Search tasks..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="scroll">
          <div className="recent-wrap">
            <div className="recent-title">Recently Tasks</div>
            {recentItems.length ? (
              <div className="recent-list">
                {recentItems.map((item) => (
                  <button className="recent-item" key={item.id} type="button">
                    <div className="recent-main">
                      <span
                        className={`recent-action ${
                          item.status === "in_progress"
                            ? "pending"
                            : item.status === "for_revision"
                              ? "revision"
                              : item.status
                        }`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      <div className="recent-text">
                        <span className="recent-task-name">{item.title}</span>
                        <div className="recent-meta">
                          <span>Created: {item.createdLabel}</span>
                          <span>Priority: {item.priority.toUpperCase()}</span>
                          <span className={`recent-deadline${item.status === "delayed" ? " delayed" : ""}`}>
                            Deadline: {item.dueLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="recent-time">{item.activityLabel}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="recent-time">No recent task activity yet.</div>
            )}
          </div>

          {sectionOrder.map((section) => {
            const tasks = sectionItems[section.key];
            const isOpen = openSections[section.key];

            return (
              <div className={`sec${isOpen ? " open" : ""}`} data-section={section.key} key={section.key}>
                <button
                  className="sec-h"
                  type="button"
                  onClick={() =>
                    setOpenSections((current) => ({
                      ...current,
                      [section.key]: !current[section.key],
                    }))
                  }
                >
                  <div className="sec-h-left">
                    <span className="sec-title">{section.title}</span>
                    <span className={`sec-badge ${section.dotClass}`} />
                  </div>
                  <div className="sec-head-right">
                    <span className="sec-count">{tasks.length}</span>
                    <span className="sec-caret">{isOpen ? "\u25BE" : "\u25B8"}</span>
                  </div>
                </button>

                {isOpen ? (
                  <div className="sec-body">
                    {tasks.length ? (
                      tasks.map((task) => (
                        <div className="task-row task-item" id={`task-${task.id}`} key={task.id}>
                          <div className="task-left">
                            <button
                              type="button"
                              className={`task-check task-check-btn${task.status === "completed" ? " is-done" : ""}`}
                              aria-label={task.status === "completed" ? "Mark incomplete" : "Mark complete"}
                              onClick={() => toggleTask(task.id)}
                            >
                              {task.status === "completed" ? "\u2713" : ""}
                            </button>

                            <div className="task-info">
                              <button type="button" className="task-title-link">
                                {task.title}
                              </button>
                              <div className="task-meta">{task.description}</div>
                            </div>

                            <div className="task-tags">
                              <span className={`status ${statusClass(task.status)}`}>{statusLabel(task.status)}</span>
                              <span className={`prio prio-${task.priority}`}>{task.priority.toUpperCase()}</span>
                            </div>
                          </div>

                          <div className="task-right">
                            <div className="task-actions">
                              <button type="button" className="btn-mini">
                                Open
                              </button>
                              <button type="button" className="btn-mini ghost">
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="task-empty">No tasks in this section.</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={`fab-task${drawerOpen ? " fab-hidden" : ""}`}
          onClick={() => setDrawerOpen(true)}
        >
          <span className="fab-plus">+</span>
        </button>

        <div className={`drawer-backdrop${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />

        <aside className={`task-drawer${drawerOpen ? " open" : ""}`} aria-hidden={!drawerOpen}>
          <div className="drawer-head">
            <div>
              <div className="drawer-title">New Task</div>
              <div className="drawer-sub">Create and publish a task</div>
            </div>
            <button type="button" className="drawer-x drawer-x-danger" onClick={() => setDrawerOpen(false)}>
              {"\u00D7"}
            </button>
          </div>

          <div className="drawer-body">
            <div className="drawer-field">
              <div className="drawer-label">TITLE</div>
              <input className="drawer-input" placeholder="Task title..." />
            </div>

            <div className="drawer-grid3 two-up">
              <div className="drawer-field">
                <div className="drawer-label">STATUS</div>
                <select className="drawer-input" defaultValue="In Progress">
                  <option>In Progress</option>
                  <option>For Revision</option>
                  <option>Completed</option>
                </select>
              </div>

              <div className="drawer-field">
                <div className="drawer-label">PRIORITY</div>
                <select className="drawer-input" defaultValue="Normal">
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <div className="drawer-grid3 two-up">
              <div className="drawer-field">
                <div className="drawer-label">DUE DATE</div>
                <input className="drawer-input" type="date" />
              </div>
              <div className="drawer-field">
                <div className="drawer-label">DUE TIME</div>
                <input className="drawer-input" type="time" />
              </div>
            </div>

            <div className="drawer-field">
              <div className="drawer-label">DESCRIPTION</div>
              <textarea className="drawer-textarea" rows={5} placeholder="Write details..." />
            </div>

            <div className="drawer-footer">
              <button type="button" className="btn-mini ghost drawer-cancel" onClick={() => setDrawerOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn drawer-publish"
                onClick={() => {
                  setDrawerOpen(false);
                  setTaskModalOpen(true);
                }}
              >
                Publish
              </button>
            </div>
          </div>
        </aside>
      </div>
    </UserShell>
  );
}
