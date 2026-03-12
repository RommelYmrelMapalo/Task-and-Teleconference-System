"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { MeetingItem, TaskItem } from "@/lib/ttcs-data";
import { buildDashboardDays } from "@/lib/planner-utils";
import { toggleTaskCompletion } from "@/lib/task-cache";

type ViewMode = "list" | "cards";
type AccentTone = "blue" | "red" | "yellow";
type AccentVariant = "a" | "b";

function subscribeToViewModeChange(onStoreChange: () => void) {
  window.addEventListener("dashboard-view-mode-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("dashboard-view-mode-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getViewModeSnapshot(): ViewMode {
  const saved = window.localStorage.getItem("dashboard_view_mode");
  return saved === "cards" || saved === "list" ? saved : "list";
}

function getViewModeServerSnapshot(): ViewMode {
  return "list";
}

function setStoredViewMode(mode: ViewMode) {
  window.localStorage.setItem("dashboard_view_mode", mode);
  window.dispatchEvent(new Event("dashboard-view-mode-change"));
}

function statusClass(task: TaskItem) {
  if (task.status === "completed") {
    return "status-completed";
  }

  return task.isDelayed ? "status-delayed" : "status-pending";
}

function statusLabel(task: TaskItem) {
  if (task.status === "completed") {
    return "COMPLETED";
  }

  if (task.isDelayed) {
    return "DELAYED";
  }

  if (task.status === "for_revision") {
    return "FOR REVISION";
  }

  return task.status === "assigned" ? "ASSIGNED" : "IN PROGRESS";
}

function getAccentClasses(seed: number) {
  const tones: AccentTone[] = ["blue", "red", "yellow"];
  const tone = tones[seed % tones.length];
  const variant: AccentVariant = seed % 2 === 0 ? "a" : "b";

  return {
    rowClass: `accent-${tone}-${variant}`,
    coverClass: `cover-${tone}-${variant}`,
  };
}

export function DashboardPlannerActions() {
  const viewMode = useSyncExternalStore(
    subscribeToViewModeChange,
    getViewModeSnapshot,
    getViewModeServerSnapshot,
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".view-kebab-wrap")) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div className="planner-actions-top">
      <button
        type="button"
        className="view-mini"
        onClick={() => window.dispatchEvent(new Event("dashboard-scroll-today"))}
      >
        Today
      </button>

      <div className="view-kebab-wrap">
        <button
          type="button"
          className="view-kebab"
          aria-label="Choose view mode"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          {"\u22EE"}
        </button>

        <div className={`view-menu${menuOpen ? " open" : ""}`} role="menu" aria-label="View mode options">
          <button
            type="button"
            className={`view-menu-item${viewMode === "list" ? " active" : ""}`}
            role="menuitem"
            onClick={() => {
              setStoredViewMode("list");
              setMenuOpen(false);
            }}
          >
            List View
          </button>
          <button
            type="button"
            className={`view-menu-item${viewMode === "cards" ? " active" : ""}`}
            role="menuitem"
            onClick={() => {
              setStoredViewMode("cards");
              setMenuOpen(false);
            }}
          >
            Card View
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardPlanner({
  tasks,
  meetings,
}: {
  tasks: TaskItem[];
  meetings: MeetingItem[];
}) {
  const router = useRouter();
  const viewMode = useSyncExternalStore(
    subscribeToViewModeChange,
    getViewModeSnapshot,
    getViewModeServerSnapshot,
  );
  const [taskList, setTaskList] = useState(() => tasks);
  const plannerRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTaskList(tasks);
  }, [tasks]);

  useEffect(() => {
    const scrollPlannerToToday = () => {
      const planner = plannerRef.current;
      const today = todayRef.current;
      if (!planner || !today) {
        return;
      }

      const wrapRect = planner.getBoundingClientRect();
      const todayRect = today.getBoundingClientRect();
      const targetTop = Math.max(0, planner.scrollTop + (todayRect.top - wrapRect.top) - 14);

      planner.scrollTo({
        top: targetTop,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    };

    window.addEventListener("dashboard-scroll-today", scrollPlannerToToday);
    return () => window.removeEventListener("dashboard-scroll-today", scrollPlannerToToday);
  }, []);

  const plannedDays = buildDashboardDays(taskList, meetings);

  const handleToggleTask = async (taskId: number) => {
    setTaskList((current) => toggleTaskCompletion(current, taskId));

    try {
      const response = await fetch(`/api/tasks/${taskId}/toggle`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not update task status.");
      }
      router.refresh();
    } catch {
      router.refresh();
    }
  };

  const openTaskDashboard = (taskId: number, shouldOpen = false) => {
    const params = new URLSearchParams({ task: String(taskId) });
    if (shouldOpen) {
      params.set("open", "1");
    }

    router.push(`/tasks?${params.toString()}`);
  };

  return (
    <div className={`planner-wrap${viewMode === "cards" ? " card-view" : ""}`} ref={plannerRef}>
      {plannedDays.length ? (
        plannedDays.map((day) => {
          const hasTasks = day.tasks.length > 0;
          const hasMeetings = day.meetings.length > 0;

          return (
            <section className="day-block" key={day.id} ref={day.dateLabel === "Today" ? todayRef : null}>
              <div className="day-head">
                <div>
                  <span className="day-title">{day.dateLabel}</span>
                  {day.dateSub ? <span className="day-sub">{day.dateSub}</span> : null}
                </div>
              </div>

              <div className="day-line" />

              {!hasTasks && !hasMeetings ? (
                <div className="nothing">Nothing planned yet.</div>
              ) : (
                <>
                  <div className="list-view">
                    {hasTasks
                      ? day.tasks.map((task) => {
                          const accent = getAccentClasses(task.id);

                          return (
                            <article
                              className={`plan-row ${accent.rowClass}${task.status === "completed" ? " is-completed" : ""} is-clickable`}
                              data-item-type="task"
                              key={`list-task-${task.id}`}
                              onClick={() => openTaskDashboard(task.id, true)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openTaskDashboard(task.id, true);
                                }
                              }}
                              role="link"
                              tabIndex={0}
                            >
                              <button
                                type="button"
                                className={`plan-check${task.status === "completed" ? " is-done" : ""}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleToggleTask(task.id);
                                }}
                                aria-label={
                                  task.status === "completed" ? `Restore ${task.title} to previous status` : `Mark ${task.title} complete`
                                }
                              >
                                {"\u2713"}
                              </button>

                              <div className="plan-mid">
                                <div className="plan-title">{task.title}</div>
                                <div className="plan-sub">{task.deadline ? `Due ${task.dueTimeLabel}` : "No due time"}</div>
                              </div>

                              <div className="plan-right">
                                <span className={`task-status-pill ${statusClass(task)}`}>{statusLabel(task)}</span>
                                <span className="pill task">Task</span>
                              </div>
                            </article>
                          );
                        })
                      : null}

                    {hasMeetings
                      ? day.meetings.map((meeting) => {
                          const accent = getAccentClasses(meeting.id);

                          return (
                            <article
                              className={`plan-row ${accent.rowClass}`}
                              data-item-type="meeting"
                              key={`list-meeting-${meeting.id}`}
                            >
                              <button type="button" className="plan-check is-disabled" disabled>
                                {"\u2713"}
                              </button>

                              <div className="plan-mid">
                                <div className="plan-title">{meeting.title}</div>
                                <div className="plan-sub">
                                  {[meeting.timeLabel, meeting.room].filter(Boolean).join(" / ") || meeting.description}
                                </div>
                              </div>

                              <div className="plan-right">
                                <span className="pill meeting">Meeting</span>
                              </div>
                            </article>
                          );
                        })
                      : null}
                  </div>

                  <div className="card-view-wrap">
                    <div className="card-grid">
                      {hasTasks
                        ? day.tasks.map((task) => {
                            const accent = getAccentClasses(task.id);

                            return (
                              <article
                                className={`gcard${task.status === "completed" ? " is-completed" : ""}`}
                                data-item-type="task"
                                key={`card-task-${task.id}`}
                              >
                                <div className={`gcard-cover ${accent.coverClass}`}>
                                  <button
                                    type="button"
                                    className="gcard-menu"
                                    aria-label={`Open ${task.title} in tasks dashboard`}
                                    onClick={() => openTaskDashboard(task.id, true)}
                                  >
                                    {"\u24D8"}
                                  </button>
                                </div>

                                <div className="gcard-body">
                                  <div className="gcard-topline">{task.title}</div>
                                  <div className="gcard-small">
                                    {task.deadline ? `Due ${task.dueTimeLabel}` : "No due time"}
                                  </div>
                                </div>

                                <div className="gcard-footer">
                                  <div className="gcard-actions">
                                    <button
                                      type="button"
                                      className={`gcheck${task.status === "completed" ? " is-done" : ""}`}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleToggleTask(task.id);
                                      }}
                                      aria-label={
                                        task.status === "completed" ? `Restore ${task.title} to previous status` : `Mark ${task.title} complete`
                                      }
                                    />
                                    <span className={`task-status-pill ${statusClass(task)}`}>{statusLabel(task)}</span>
                                    <span className="pill task">Task</span>
                                  </div>
                                </div>
                              </article>
                            );
                          })
                        : null}

                      {hasMeetings
                        ? day.meetings.map((meeting) => {
                            const accent = getAccentClasses(meeting.id);

                            return (
                              <article className="gcard" data-item-type="meeting" key={`card-meeting-${meeting.id}`}>
                                <div className={`gcard-cover ${accent.coverClass}`}>
                                  <div className="gcard-menu">{"\u22EE"}</div>
                                </div>

                                <div className="gcard-body">
                                  <div className="gcard-topline">{meeting.title}</div>
                                  <div className="gcard-subline">Meeting</div>
                                  <div className="gcard-small">
                                    {[meeting.timeLabel, meeting.room].filter(Boolean).join(" / ") || meeting.description}
                                  </div>
                                </div>

                                <div className="gcard-footer">
                                  <div className="gcard-actions">
                                    <button type="button" className="gcheck is-disabled" disabled />
                                    <span className="gcard-pill">Meeting</span>
                                  </div>
                                </div>
                              </article>
                            );
                          })
                        : null}
                    </div>
                  </div>
                </>
              )}
            </section>
          );
        })
      ) : (
        <section className="day-block" ref={todayRef}>
          <div className="day-head">
            <div>
              <span className="day-title">Today</span>
            </div>
          </div>
          <div className="day-line" />
          <div className="nothing">Nothing planned yet.</div>
        </section>
      )}
    </div>
  );
}
