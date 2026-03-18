"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import {
  DASHBOARD_CALENDAR_FILTER_EVENT,
  defaultDashboardCalendarFilters,
  type DashboardCalendarFilterKey,
  type DashboardCalendarFilters,
} from "@/lib/dashboard-calendar-filters";
import type { TaskItem } from "@/lib/ttcs-data";

const STORAGE_KEY = "ttcs-admin-calendar-organizer";

const filterItems: Array<{ key: DashboardCalendarFilterKey; label: string }> = [
  { key: "pending", label: "Pending Tasks" },
  { key: "delayed", label: "Delayed Tasks" },
  { key: "completed", label: "Completed Tasks" },
  { key: "meetings", label: "Meeting Notices" },
];

type OrganizerCalendar = {
  id: string;
  name: string;
  taskIds: number[];
};

type ComposerTaskFilter = "all" | "pending" | "delayed" | "completed";

type PendingConfirm =
  | {
      kind: "calendar";
      calendarId: string;
      message: string;
    }
  | {
      kind: "task";
      calendarId: string;
      taskId: number;
      message: string;
    };

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="sidebar-calendar-chevron-icon">
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="sidebar-calendar-check-icon">
      <path d="M3.5 8.5 6.5 11.5 12.5 5.5" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="sidebar-calendar-delete-icon">
      <path d="M5.5 3.5h5" />
      <path d="M6.5 2.5h3" />
      <path d="M4.5 4.5h7l-.5 7a1 1 0 0 1-1 .9H6a1 1 0 0 1-1-.9l-.5-7Z" />
      <path d="M6.8 6.4v4.1" />
      <path d="M9.2 6.4v4.1" />
    </svg>
  );
}

function getTaskTone(task: TaskItem) {
  if (task.status === "completed") {
    return "completed";
  }

  if (task.isDelayed) {
    return "delayed";
  }

  return "pending";
}

function getTaskLabel(task: TaskItem) {
  if (task.status === "completed") {
    return "Completed";
  }

  if (task.isDelayed) {
    return "Delayed";
  }

  return "Pending";
}

function normalizeCalendars(value: unknown, tasks: TaskItem[]): OrganizerCalendar[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const validTaskIds = new Set(tasks.map((task) => task.id));

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Partial<OrganizerCalendar>;
      const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : null;
      const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : null;
      const taskIds = Array.isArray(item.taskIds)
        ? item.taskIds.filter((taskId): taskId is number => typeof taskId === "number" && validTaskIds.has(taskId))
        : [];

      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        taskIds,
      };
    })
    .filter((item): item is OrganizerCalendar => Boolean(item));
}

function getCalendarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}`;
}

export function DashboardSidebarCalendars({ tasks }: { tasks: TaskItem[] }) {
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    filters: true,
    organizer: true,
  });
  const [filters, setFilters] = useState<DashboardCalendarFilters>(defaultDashboardCalendarFilters);
  const [organizerCalendars, setOrganizerCalendars] = useState<OrganizerCalendar[]>([]);
  const [hasLoadedCalendars, setHasLoadedCalendars] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftTaskIds, setDraftTaskIds] = useState<number[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<ComposerTaskFilter>("all");
  const [openMenuCalendarId, setOpenMenuCalendarId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const sortedTasks = useMemo(
    () => [...tasks].sort((left, right) => left.title.localeCompare(right.title)),
    [tasks],
  );
  const selectedDraftTasks = useMemo(
    () =>
      draftTaskIds
        .map((taskId) => taskMap.get(taskId))
        .filter((task): task is TaskItem => Boolean(task)),
    [draftTaskIds, taskMap],
  );
  const filteredTasks = useMemo(() => {
    const normalizedQuery = taskSearch.trim().toLowerCase();

    return sortedTasks.filter((task) => {
      const tone = getTaskTone(task);
      const matchesFilter = taskFilter === "all" || tone === taskFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${task.title} ${task.description} ${task.dueLabel}`.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [sortedTasks, taskFilter, taskSearch]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<DashboardCalendarFilters>(DASHBOARD_CALENDAR_FILTER_EVENT, {
        detail: filters,
      }),
    );
  }, [filters]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as unknown;
      const normalized = normalizeCalendars(parsed, tasks);
      setOrganizerCalendars(normalized);
      setOpenGroups((current) => ({
        ...current,
        ...Object.fromEntries(normalized.map((calendar) => [`calendar:${calendar.id}`, true])),
      }));
    } catch {
      setOrganizerCalendars([]);
    } finally {
      setHasLoadedCalendars(true);
    }
  }, [tasks]);

  useEffect(() => {
    const normalized = organizerCalendars.map((calendar) => ({
      ...calendar,
      taskIds: calendar.taskIds.filter((taskId) => taskMap.has(taskId)),
    }));

    if (
      normalized.length !== organizerCalendars.length ||
      normalized.some((calendar, index) => calendar.taskIds.length !== organizerCalendars[index]?.taskIds.length)
    ) {
      setOrganizerCalendars(normalized);
    }
  }, [organizerCalendars, taskMap]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedCalendars) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(organizerCalendars));
  }, [hasLoadedCalendars, organizerCalendars]);

  const resetComposer = () => {
    setComposerOpen(false);
    setEditingCalendarId(null);
    setDraftName("");
    setDraftTaskIds([]);
    setTaskSearch("");
    setTaskFilter("all");
  };

  const openCreateComposer = () => {
    setComposerOpen(true);
    setEditingCalendarId(null);
    setDraftName("");
    setDraftTaskIds([]);
    setTaskSearch("");
    setTaskFilter("all");
    setOpenGroups((current) => ({
      ...current,
      organizer: true,
    }));
  };

  const openEditComposer = (calendar: OrganizerCalendar) => {
    setComposerOpen(true);
    setEditingCalendarId(calendar.id);
    setDraftName(calendar.name);
    setDraftTaskIds(calendar.taskIds);
    setTaskSearch("");
    setTaskFilter("all");
    setOpenGroups((current) => ({
      ...current,
      organizer: true,
      [`calendar:${calendar.id}`]: true,
    }));
  };

  const saveCalendar = () => {
    const name = draftName.trim();

    if (!name) {
      return;
    }

    const nextCalendar: OrganizerCalendar = {
      id: editingCalendarId ?? getCalendarId(),
      name,
      taskIds: draftTaskIds.filter((taskId, index, list) => list.indexOf(taskId) === index),
    };

    setOrganizerCalendars((current) => {
      if (editingCalendarId) {
        return current.map((calendar) => (calendar.id === editingCalendarId ? nextCalendar : calendar));
      }

      return [...current, nextCalendar];
    });

    setOpenGroups((current) => ({
      ...current,
      organizer: true,
      [`calendar:${nextCalendar.id}`]: true,
    }));
    resetComposer();
  };

  const removeCalendar = (calendarId: string) => {
    setOrganizerCalendars((current) => current.filter((calendar) => calendar.id !== calendarId));
    setOpenGroups((current) => {
      const next = { ...current };
      delete next[`calendar:${calendarId}`];
      return next;
    });

    if (editingCalendarId === calendarId) {
      resetComposer();
    }

    setOpenMenuCalendarId((current) => (current === calendarId ? null : current));
  };

  const toggleDraftTask = (taskId: number) => {
    setDraftTaskIds((current) =>
      current.includes(taskId) ? current.filter((entry) => entry !== taskId) : [...current, taskId],
    );
  };

  const removeTaskFromCalendar = (calendarId: string, taskId: number) => {
    setOrganizerCalendars((current) =>
      current.map((calendar) =>
        calendar.id === calendarId
          ? {
              ...calendar,
              taskIds: calendar.taskIds.filter((entry) => entry !== taskId),
            }
          : calendar,
      ),
    );
  };

  const confirmPendingAction = () => {
    if (!pendingConfirm) {
      return;
    }

    if (pendingConfirm.kind === "calendar") {
      removeCalendar(pendingConfirm.calendarId);
    } else {
      removeTaskFromCalendar(pendingConfirm.calendarId, pendingConfirm.taskId);
    }

    setPendingConfirm(null);
  };

  return (
    <>
      <div className="sidebar-calendar-panel">
        <div className="sidebar-calendar-groups">
          <section className="sidebar-calendar-group">
            <button
              type="button"
              className="sidebar-calendar-trigger"
              aria-expanded={openGroups.filters}
              onClick={() =>
                setOpenGroups((current) => ({
                  ...current,
                  filters: !current.filters,
                }))
              }
            >
              <span>Calendar Filters</span>
              <span className={`sidebar-calendar-caret${openGroups.filters ? " open" : ""}`}>
                <ChevronRightIcon />
              </span>
            </button>

            {openGroups.filters ? (
              <div className="sidebar-calendar-items">
                {filterItems.map((item) => {
                  const isActive = filters[item.key];

                  return (
                    <button
                      type="button"
                      className="sidebar-calendar-item"
                      key={item.key}
                      aria-pressed={isActive}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          [item.key]: !current[item.key],
                        }))
                      }
                    >
                      <span className={`sidebar-calendar-check${isActive ? " active" : ""}`}>
                        {isActive ? <CheckIcon /> : null}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          <div className="sidebar-calendar-separator" aria-hidden="true" />

          <section className="sidebar-calendar-group">
            <button
              type="button"
              className="sidebar-calendar-trigger"
              aria-expanded={openGroups.organizer}
              onClick={() =>
                setOpenGroups((current) => ({
                  ...current,
                  organizer: !current.organizer,
                }))
              }
            >
              <span>Organizer</span>
              <span className={`sidebar-calendar-caret${openGroups.organizer ? " open" : ""}`}>
                <ChevronRightIcon />
              </span>
            </button>

            {openGroups.organizer ? (
              <div className="sidebar-calendar-organizer">
                {organizerCalendars.length ? (
                  organizerCalendars.map((calendar) => {
                    const calendarTasks = calendar.taskIds
                      .map((taskId) => taskMap.get(taskId))
                      .filter((task): task is TaskItem => Boolean(task));
                    const groupKey = `calendar:${calendar.id}`;
                    const isOpen = openGroups[groupKey] ?? true;

                    return (
                      <section className="sidebar-calendar-saved" key={calendar.id}>
                        <div className="sidebar-calendar-saved-head">
                          <button
                            type="button"
                            className="sidebar-calendar-trigger sidebar-calendar-trigger-saved sidebar-calendar-header-toggle"
                            aria-expanded={isOpen}
                            onClick={() =>
                              setOpenGroups((current) => ({
                                ...current,
                                [groupKey]: !isOpen,
                              }))
                            }
                          >
                            <span>{calendar.name}</span>
                            <span className="sidebar-calendar-count">{calendarTasks.length}</span>
                            <span className={`sidebar-calendar-caret${isOpen ? " open" : ""}`}>
                              <ChevronRightIcon />
                            </span>
                          </button>

                          <div className="sidebar-calendar-header-actions">
                            <button
                              type="button"
                              className="sidebar-calendar-icon-button"
                              onClick={() => {
                                setOpenMenuCalendarId(null);
                                openEditComposer(calendar);
                              }}
                              aria-label={`Add tasks to ${calendar.name}`}
                              title="Add tasks"
                            >
                              +
                            </button>
                            <div className="sidebar-calendar-menu-wrap">
                              <button
                                type="button"
                                className="sidebar-calendar-icon-button"
                                onClick={() =>
                                  setOpenMenuCalendarId((current) =>
                                    current === calendar.id ? null : calendar.id,
                                  )
                                }
                                aria-label={`More actions for ${calendar.name}`}
                                title="More actions"
                              >
                                ...
                              </button>
                              {openMenuCalendarId === calendar.id ? (
                                <div className="sidebar-calendar-menu">
                                  <button
                                    type="button"
                                    className="sidebar-calendar-menu-item danger"
                                    onClick={() => {
                                      setOpenMenuCalendarId(null);
                                      setPendingConfirm({
                                        kind: "calendar",
                                        calendarId: calendar.id,
                                        message: "Remove folder?",
                                      });
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="sidebar-calendar-saved-body">
                            <div className="sidebar-calendar-task-list">
                              {calendarTasks.length ? (
                                calendarTasks.map((task) => (
                                  <div className="sidebar-calendar-task" key={task.id}>
                                    <button
                                      type="button"
                                      className="sidebar-calendar-task-main"
                                      onClick={() => router.push(`/admin/tasks?task=${task.id}&open=1`)}
                                    >
                                      <span className="sidebar-calendar-task-copy">
                                        <span className="sidebar-calendar-task-title">{task.title}</span>
                                        <span className="sidebar-calendar-task-sub">{task.deadline ? task.dueLabel : "No deadline"}</span>
                                      </span>
                                    </button>
                                    <div className="sidebar-calendar-task-side">
                                      <span className={`sidebar-calendar-task-pill is-${getTaskTone(task)}`}>{getTaskLabel(task)}</span>
                                      <button
                                        type="button"
                                        className="sidebar-calendar-task-remove"
                                        onClick={() =>
                                          setPendingConfirm({
                                            kind: "task",
                                            calendarId: calendar.id,
                                            taskId: task.id,
                                            message: `Remove task in ${calendar.name}?`,
                                          })
                                        }
                                        aria-label={`Remove ${task.title} from ${calendar.name}`}
                                        title="Remove task"
                                      >
                                        <DeleteIcon />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="sidebar-calendar-empty">No tasks added yet.</p>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </section>
                    );
                  })
                ) : (
                  <p className="sidebar-calendar-empty">No organizer calendars yet.</p>
                )}
              </div>
            ) : null}
          </section>

          <button type="button" className="sidebar-calendar-create" onClick={openCreateComposer}>
            <span>+</span>
            <span>New Calendar</span>
          </button>
        </div>
      </div>

      {hasMounted && composerOpen
        ? createPortal(
            <div className="sidebar-calendar-modal-backdrop" onClick={resetComposer}>
              <div
                className="sidebar-calendar-modal"
                role="dialog"
                aria-modal="true"
                aria-label={editingCalendarId ? "Edit calendar" : "Create calendar"}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="sidebar-calendar-modal-head">
                  <div>
                    <h3>{editingCalendarId ? "Edit Calendar" : "New Calendar"}</h3>
                    <p>
                      {editingCalendarId
                        ? "Update the calendar name and task list."
                        : "Create an organizer calendar and add tasks to it."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="sidebar-calendar-modal-close"
                    onClick={resetComposer}
                    aria-label="Close calendar modal"
                  >
                    {"\u00D7"}
                  </button>
                </div>

                <div className="sidebar-calendar-composer">
                  <label className="sidebar-calendar-field">
                    <span>Calendar Name</span>
                    <input
                      className="sidebar-calendar-input"
                      type="text"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="Enter calendar name"
                    />
                  </label>

                  <div className="sidebar-calendar-field">
                    <span>Selected Tasks</span>
                    <div className="sidebar-calendar-selected">
                      {selectedDraftTasks.length ? (
                        selectedDraftTasks.map((task) => (
                          <button
                            type="button"
                            className={`sidebar-calendar-selected-chip is-${getTaskTone(task)}`}
                            key={`selected-${task.id}`}
                            onClick={() => toggleDraftTask(task.id)}
                            title={`Remove ${task.title}`}
                          >
                            <span>{task.title}</span>
                            <span className="sidebar-calendar-selected-remove">{"\u00D7"}</span>
                          </button>
                        ))
                      ) : (
                        <p className="sidebar-calendar-empty">No tasks selected yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="sidebar-calendar-field">
                    <span>Choose Tasks</span>
                    <div className="sidebar-calendar-picker-toolbar">
                      <input
                        className="sidebar-calendar-input sidebar-calendar-search"
                        type="text"
                        value={taskSearch}
                        onChange={(event) => setTaskSearch(event.target.value)}
                        placeholder="Search tasks"
                      />
                      <div className="sidebar-calendar-filter-tabs">
                        {(["all", "pending", "delayed", "completed"] as ComposerTaskFilter[]).map((item) => (
                          <button
                            type="button"
                            className={`sidebar-calendar-filter-tab${taskFilter === item ? " is-active" : ""}`}
                            key={item}
                            onClick={() => setTaskFilter(item)}
                          >
                            {item === "all" ? "All" : item.charAt(0).toUpperCase() + item.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sidebar-calendar-picker-meta">
                      <span>{filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"} shown</span>
                      {draftTaskIds.length ? (
                        <button
                          type="button"
                          className="sidebar-calendar-text-action"
                          onClick={() => setDraftTaskIds([])}
                        >
                          Clear selected
                        </button>
                      ) : null}
                    </div>

                    <div className="sidebar-calendar-task-picker">
                      {filteredTasks.length ? (
                        filteredTasks.map((task) => {
                          const isSelected = draftTaskIds.includes(task.id);

                          return (
                            <button
                              type="button"
                              className={`sidebar-calendar-picker-item${isSelected ? " is-selected" : ""}`}
                              key={task.id}
                              aria-pressed={isSelected}
                              onClick={() => toggleDraftTask(task.id)}
                            >
                              <span className={`sidebar-calendar-check${isSelected ? " active" : ""}`}>
                                {isSelected ? <CheckIcon /> : null}
                              </span>
                              <span className="sidebar-calendar-picker-copy">
                                <span>{task.title}</span>
                                <span>{task.deadline ? task.dueLabel : "No deadline"}</span>
                              </span>
                              <span className={`sidebar-calendar-task-pill is-${getTaskTone(task)}`}>
                                {getTaskLabel(task)}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <p className="sidebar-calendar-empty">No tasks match the current search or filter.</p>
                      )}
                    </div>
                  </div>

                  <div className="sidebar-calendar-composer-actions">
                    <button type="button" className="sidebar-calendar-inline-action" onClick={resetComposer}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="sidebar-calendar-inline-action primary"
                      onClick={saveCalendar}
                      disabled={!draftName.trim()}
                    >
                      {editingCalendarId ? "Update Calendar" : "Create Calendar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {hasMounted && pendingConfirm
        ? createPortal(
            <div className="sidebar-calendar-modal-backdrop" onClick={() => setPendingConfirm(null)}>
              <div
                className="sidebar-calendar-modal sidebar-calendar-confirm"
                role="dialog"
                aria-modal="true"
                aria-label="Confirm organizer removal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="sidebar-calendar-modal-head">
                  <div>
                    <h3>Confirm Remove</h3>
                    <p>{pendingConfirm.message}</p>
                  </div>
                  <button
                    type="button"
                    className="sidebar-calendar-modal-close"
                    onClick={() => setPendingConfirm(null)}
                    aria-label="Close confirmation modal"
                  >
                    {"\u00D7"}
                  </button>
                </div>

                <div className="sidebar-calendar-confirm-actions">
                  <button
                    type="button"
                    className="sidebar-calendar-inline-action"
                    onClick={() => setPendingConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="sidebar-calendar-inline-action danger"
                    onClick={confirmPendingAction}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
