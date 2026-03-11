"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type TaskStatus = "in_progress" | "for_revision" | "completed";
type ViewMode = "list" | "cards";
type AccentTone = "blue" | "red" | "yellow";
type AccentVariant = "a" | "b";

type FlashMessage = {
  id: string;
  category: "success" | "error";
  message: string;
};

type TaskItem = {
  id: number;
  title: string;
  dueTime?: string;
  status: TaskStatus;
  originalStatus: Exclude<TaskStatus, "completed">;
  isDelayed: boolean;
};

type MeetingItem = {
  id: number;
  title: string;
  timeRange?: string;
  room?: string;
};

type DayPlan = {
  id: string;
  dateLabel: string;
  dateSub?: string;
  tasks: TaskItem[];
  meetings: MeetingItem[];
};

type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "tasks" | "meetings" | "timein" | "timeout" | "inbox";
  active?: boolean;
  badge?: string;
};

const navGroups: { section: string; items: NavItem[] }[] = [
  {
    section: "MAIN",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard", active: true }],
  },
  {
    section: "TASKS",
    items: [{ href: "/tasks", label: "Tasks Dashboard", icon: "tasks" }],
  },
  {
    section: "TELECONFERENCE",
    items: [
      { href: "/assigned-meetings", label: "Assigned Meetings", icon: "meetings" },
      { href: "/record-timein", label: "Record Time-in", icon: "timein" },
      { href: "/record-timeout", label: "Record Time-out", icon: "timeout" },
      { href: "/inbox", label: "Inbox", icon: "inbox", badge: "3" },
    ],
  },
];

const initialMessages: FlashMessage[] = [];

const initialPlannedDays: DayPlan[] = [
  {
    id: "today",
    dateLabel: "Today",
    dateSub: "March 10, 2026",
    tasks: [
      {
        id: 101,
        title: "Finalize sprint dashboard conversion",
        dueTime: "4:00 PM",
        status: "in_progress",
        originalStatus: "in_progress",
        isDelayed: false,
      },
      {
        id: 102,
        title: "Review faculty approval comments",
        dueTime: "6:30 PM",
        status: "for_revision",
        originalStatus: "for_revision",
        isDelayed: true,
      },
    ],
    meetings: [
      {
        id: 201,
        title: "Capstone checkpoint",
        timeRange: "1:00 PM - 2:00 PM",
        room: "Room 402",
      },
    ],
  },
  {
    id: "tomorrow",
    dateLabel: "Wednesday",
    dateSub: "March 11, 2026",
    tasks: [
      {
        id: 103,
        title: "Prepare testing handoff notes",
        dueTime: "9:00 AM",
        status: "completed",
        originalStatus: "in_progress",
        isDelayed: false,
      },
    ],
    meetings: [],
  },
  { id: "friday", dateLabel: "Friday", dateSub: "March 13, 2026", tasks: [], meetings: [] },
];

function statusClass(status: TaskStatus, isDelayed: boolean) {
  if (status === "completed") return "status-completed";
  return isDelayed ? "status-delayed" : "status-pending";
}

function statusLabel(status: TaskStatus, isDelayed: boolean) {
  if (status === "completed") return "COMPLETED";
  return isDelayed ? "DELAYED" : status.replaceAll("_", " ").toUpperCase();
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

function SidebarIcon({ icon }: { icon: NavItem["icon"] }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "dashboard":
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="4.5" rx="1.5" />
          <rect x="14" y="10.5" width="7" height="10.5" rx="1.5" />
          <rect x="3" y="13.5" width="7" height="7.5" rx="1.5" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M9 11l2 2 4-4" />
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
    case "meetings":
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );
    case "timein":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </svg>
      );
    case "timeout":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M6 2h12" />
          <path d="M8 2v4l4 4-4 4v4" />
          <path d="M16 2v4l-4 4 4 4v4" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 6h16l-1.5 11H5.5L4 6z" />
          <path d="M8 11h8l-1 3h-6l-1-3z" />
        </svg>
      );
  }
}

export default function Home() {
  const [messages, setMessages] = useState(initialMessages);
  const viewMode = useSyncExternalStore(
    subscribeToViewModeChange,
    getViewModeSnapshot,
    getViewModeServerSnapshot,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [plannedDays, setPlannedDays] = useState(initialPlannedDays);
  const plannerRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!messages.length) return;
    const timeout = window.setTimeout(() => setMessages([]), 4200);
    return () => window.clearTimeout(timeout);
  }, [messages]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setUserMenuOpen(false);
      }
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".view-kebab-wrap")) setMenuOpen(false);
      if (!target?.closest(".user-box")) setUserMenuOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  const scrollPlannerToToday = () => {
    const planner = plannerRef.current;
    const today = todayRef.current;
    if (!planner || !today) return;

    const wrapRect = planner.getBoundingClientRect();
    const todayRect = today.getBoundingClientRect();
    const targetTop = Math.max(0, planner.scrollTop + (todayRect.top - wrapRect.top) - 14);

    planner.scrollTo({
      top: targetTop,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const toggleTask = (taskId: number) => {
    setPlannedDays((current) =>
      current.map((day) => ({
        ...day,
        tasks: day.tasks.map((task) =>
          task.id !== taskId
            ? task
            : {
                ...task,
                status: task.status === "completed" ? task.originalStatus : "completed",
              },
        ),
      })),
    );
  };

  return (
    <main className="dashboard-page">
      <div className="app-shell">
        <aside className="sidebar-dark">
          <div className="sidebar-brand">
            <Image
              src="/PTV_LOGO.png"
              alt="TTCS logo"
              width={50}
              height={50}
              className="sidebar-brand-logo"
              priority
            />
            <div className="sidebar-brand-copy">
              <span>TASK AND</span>
              <span>TELECONFERENCE</span>
              <span>SYSTEM</span>
            </div>
          </div>

          <div className="sidebar-nav">
            {navGroups.map((group) => (
              <div key={group.section}>
                <div className="sidebar-section">{group.section}</div>
                {group.items.map((item) => (
                  <Link key={item.label} className={`sidebar-link${item.active ? " active" : ""}`} href={item.href}>
                    <span className="sidebar-icon">
                      <SidebarIcon icon={item.icon} />
                    </span>
                    <span>{item.label}</span>
                    {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className={`user-box${userMenuOpen ? " open" : ""}`}>
              <div className="user-actions">
                <Link className="user-action-link" href="/profile">
                  Settings
                </Link>
                <Link className="user-action-link" href="/">
                  Logout
                </Link>
              </div>

              <button
                className="user-trigger"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setUserMenuOpen((open) => !open);
                }}
              >
                <div className="user-row">
                  <div className="user-avatar">JS</div>
                  <div>
                    <div className="user-name">Juan Student</div>
                    <div className="user-sub">User</div>
                  </div>
                </div>
                <div className="caret">{userMenuOpen ? "\u25B4" : "\u25BE"}</div>
              </button>
            </div>
          </div>
        </aside>

        <section className="main-area">
          <div className="content-wrap">
            <div className="main-inner">
              <div className="dashboard-head">
                <div className="dashboard-head-left">
                  <div className="td-title">Dashboard</div>
                  <div className="td-sub">Overview of meetings and tasks</div>
                </div>

                <div className="planner-actions-top">
                  <button type="button" className="view-mini" onClick={scrollPlannerToToday}>
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
              </div>

              {messages.length > 0 ? (
                <div className="flash-stack" aria-live="polite" aria-atomic="true">
                  {messages.map((item) =>
                    item.message === "Task updated!" ? (
                      <div className="modal-overlay show autoModal" key={item.id}>
                        <div className={`modal-popup ${item.category} modern-popup`} role="status" aria-live="polite">
                          <div className="modal-icon-wrap">
                            <div className="modal-icon" aria-hidden="true">
                              {item.category === "error" ? "\u2715" : "\u2713"}
                            </div>
                          </div>
                          <div className="modal-text">{item.message}</div>
                          <div className="modal-subtext">
                            {item.category === "error"
                              ? "Please review your changes and try again."
                              : "Your latest task changes were saved successfully."}
                          </div>
                          <div className="modal-progress" aria-hidden="true" />
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flash-modern ${item.category === "error" ? "flash-modern-error" : "flash-modern-success"} is-visible`}
                        key={item.id}
                        role="alert"
                      >
                        <div className="flash-modern-content">
                          <span className="flash-modern-dot" />
                          <span>{item.message}</span>
                        </div>
                        <button
                          type="button"
                          className="flash-modern-close"
                          aria-label="Close"
                          onClick={() => setMessages((current) => current.filter((message) => message.id !== item.id))}
                        >
                          {"\u00D7"}
                        </button>
                      </div>
                    ),
                  )}
                </div>
              ) : null}

              <div className={`planner-wrap${viewMode === "cards" ? " card-view" : ""}`} ref={plannerRef}>
                {plannedDays.length > 0 ? (
                  plannedDays.map((day) => {
                    const hasTasks = day.tasks.length > 0;
                    const hasMeetings = day.meetings.length > 0;

                    return (
                      <div
                        className="day-block"
                        id={day.dateLabel === "Today" ? "todayPlanner" : undefined}
                        key={day.id}
                        ref={day.dateLabel === "Today" ? todayRef : null}
                      >
                        <div className="day-head">
                          <div>
                            {day.dateLabel === "Today" && day.dateSub ? (
                              <span className="day-title today-title">Today, {day.dateSub}</span>
                            ) : (
                              <>
                                <span className="day-title">{day.dateLabel}</span>
                                {day.dateSub ? <span className="day-sub">{day.dateSub}</span> : null}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="day-line" />

                        {!hasTasks && !hasMeetings ? (
                          <div className="nothing">Nothing Planned Yet</div>
                        ) : (
                          <>
                            <div className="list-view">
                              {hasTasks
                                ? day.tasks.map((task) => {
                                    const delayed = task.isDelayed && task.status !== "completed";
                                    const accent = getAccentClasses(task.id);

                                    return (
                                      <div
                                        className={`plan-row ${accent.rowClass}`}
                                        data-item-type="task"
                                        data-task-id={task.id}
                                        data-status={task.status}
                                        data-original-status={task.originalStatus}
                                        data-is-delayed={task.isDelayed ? "1" : "0"}
                                        key={`list-task-${task.id}`}
                                      >
                                        <button
                                          type="button"
                                          className={`plan-check${task.status === "completed" ? " is-done" : ""}`}
                                          aria-label="Mark complete"
                                          onClick={() => toggleTask(task.id)}
                                        >
                                          {"\u2713"}
                                        </button>

                                        <div className="plan-mid">
                                          <div className="plan-title">
                                            <button type="button" className="task-link">
                                              {task.title}
                                            </button>
                                          </div>
                                          <div className="plan-sub">
                                            {task.dueTime ? `Due ${task.dueTime}` : "No due time"}
                                          </div>
                                        </div>

                                        <div className="plan-right">
                                          <span className={`task-status-pill ${statusClass(task.status, delayed)}`}>
                                            {statusLabel(task.status, delayed)}
                                          </span>
                                          <span className="pill task">Task</span>
                                        </div>
                                      </div>
                                    );
                                  })
                                : null}

                              {hasMeetings
                                ? day.meetings.map((meeting) => {
                                    const accent = getAccentClasses(meeting.id);

                                    return (
                                    <div
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
                                          {[meeting.timeRange, meeting.room].filter(Boolean).join(" / ")}
                                        </div>
                                      </div>

                                      <div className="plan-right">
                                        <span className="pill meeting">Meeting</span>
                                      </div>
                                    </div>
                                  );
                                  })
                                : null}
                            </div>

                            <div className="card-view-wrap">
                              <div className="card-grid">
                                {hasTasks
                                  ? day.tasks.map((task) => {
                                      const delayed = task.isDelayed && task.status !== "completed";
                                      const accent = getAccentClasses(task.id);

                                      return (
                                        <div
                                          className="gcard"
                                          data-item-type="task"
                                          data-task-id={task.id}
                                          data-status={task.status}
                                          data-original-status={task.originalStatus}
                                          data-is-delayed={task.isDelayed ? "1" : "0"}
                                          key={`card-task-${task.id}`}
                                        >
                                          <div className={`gcard-cover ${accent.coverClass}`}>
                                            <div className="gcard-menu">{"\u22EE"}</div>
                                          </div>

                                          <div className="gcard-body">
                                            <button type="button" className="task-link gcard-topline gcard-title-link">
                                              {task.title}
                                            </button>
                                            <div className="gcard-small">
                                              {task.dueTime ? `Due ${task.dueTime}` : "No due time"}
                                            </div>
                                          </div>

                                          <div className="gcard-footer">
                                            <div className="gicons">
                                              <button type="button" className="gicon" title="Details">
                                                {"\uD83D\uDCCB"}
                                              </button>
                                            </div>

                                            <div className="gcard-actions">
                                              <button
                                                type="button"
                                                className={`gcheck${task.status === "completed" ? " is-done" : ""}`}
                                                aria-label={task.status === "completed" ? "Completed task" : "Mark complete"}
                                                onClick={() => toggleTask(task.id)}
                                              >
                                                {task.status === "completed" ? "\u2713" : ""}
                                              </button>

                                              <span className={`task-status-pill ${statusClass(task.status, delayed)}`}>
                                                {statusLabel(task.status, delayed)}
                                              </span>
                                              <span className="pill task">Task</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  : null}

                                {hasMeetings
                                  ? day.meetings.map((meeting) => {
                                      const accent = getAccentClasses(meeting.id);

                                      return (
                                      <div className="gcard" data-item-type="meeting" key={`card-meeting-${meeting.id}`}>
                                        <div className={`gcard-cover ${accent.coverClass}`}>
                                          <div className="gcard-menu">{"\u22EE"}</div>
                                        </div>

                                        <div className="gcard-body">
                                          <button type="button" className="task-link gcard-topline gcard-title-link">
                                            {meeting.title}
                                          </button>
                                          <div className="gcard-subline">Meeting</div>
                                          <div className="gcard-small">
                                            {[meeting.timeRange, meeting.room].filter(Boolean).join(" / ")}
                                          </div>
                                        </div>

                                        <div className="gcard-footer">
                                          <div className="gicons">
                                            <span className="gicon" title="Details">
                                              Details
                                            </span>
                                          </div>

                                          <div className="gcard-actions">
                                            <button type="button" className="gcheck is-disabled" disabled>
                                              {"\u2713"}
                                            </button>
                                            <span className="gcard-pill">Meeting</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                    })
                                  : null}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="day-block" id="todayPlanner" ref={todayRef}>
                    <div className="day-head">
                      <div>
                        <span className="day-title">Today</span>
                      </div>
                    </div>
                    <div className="day-line" />
                    <div className="nothing">Nothing Planned Yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
