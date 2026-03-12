"use client";

import Link from "next/link";
import { useState } from "react";
import type { MeetingItem, TaskItem } from "@/lib/ttcs-data";

const MANILA_TZ = "Asia/Manila";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function taskWorkflowLabel(task: TaskItem) {
  if (task.status === "completed") {
    return "Completed";
  }

  if (task.status === "for_revision") {
    return "For Revision";
  }

  if (task.status === "assigned") {
    return "Assigned";
  }

  return "In Progress";
}

function getManilaParts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 1);

  return { year, month, day };
}

function dayKeyFromValue(value: string | Date) {
  const parts = getManilaParts(value);
  return `${parts.year}-${`${parts.month}`.padStart(2, "0")}-${`${parts.day}`.padStart(2, "0")}`;
}

function getMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getChipTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getCurrentMonth() {
  const parts = getManilaParts(new Date());
  return { year: parts.year, month: parts.month };
}

function sortByDateAscending(left: TaskItem, right: TaskItem) {
  const leftValue = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
  const rightValue = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
  return leftValue - rightValue;
}

function sortByActivityDescending(left: TaskItem, right: TaskItem) {
  return new Date(right.activityAt).getTime() - new Date(left.activityAt).getTime();
}

export function AdminDashboardCalendar({
  tasks,
  meetings,
}: {
  tasks: TaskItem[];
  meetings: MeetingItem[];
}) {
  const overviewScrollStyle = {
    width: "100%",
    maxWidth: "100%",
    overflow: "auto",
    paddingBottom: "6px",
    minHeight: 0,
  } satisfies React.CSSProperties;
  const overviewGridStyle = {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "minmax(740px, 1.85fr) minmax(320px, 360px)",
    alignItems: "stretch",
    minWidth: "1080px",
  } satisfies React.CSSProperties;
  const calendarShellStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minWidth: 0,
    height: "100%",
    padding: "18px",
    borderRadius: "20px",
  } satisfies React.CSSProperties;
  const toolbarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  } satisfies React.CSSProperties;
  const monthSwitchStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#64748b",
    fontWeight: 700,
  } satisfies React.CSSProperties;
  const monthNavStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.92)",
    color: "#1d4ed8",
    cursor: "pointer",
  } satisfies React.CSSProperties;
  const weekdayGridStyle = {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    color: "#64748b",
    fontSize: "0.82rem",
    fontWeight: 800,
  } satisfies React.CSSProperties;
  const monthGridStyle = {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    alignContent: "start",
  } satisfies React.CSSProperties;
  const sideStackStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100%",
  } satisfies React.CSSProperties;
  const [visibleMonth, setVisibleMonth] = useState(getCurrentMonth);

  const eventMap = new Map<
    string,
    Array<{
      id: string;
      tone: "meeting" | "pending" | "delayed" | "completed";
      timeLabel: string;
      title: string;
      sortValue: number;
    }>
  >();

  for (const meeting of meetings) {
    const key = dayKeyFromValue(meeting.dateTime);
    const existing = eventMap.get(key) ?? [];
    existing.push({
      id: `meeting-${meeting.id}`,
      tone: "meeting",
      timeLabel: getChipTime(meeting.dateTime),
      title: meeting.title,
      sortValue: new Date(meeting.dateTime).getTime(),
    });
    eventMap.set(key, existing);
  }

  for (const task of tasks) {
    if (!task.deadline) {
      continue;
    }

    const key = dayKeyFromValue(task.deadline);
    const existing = eventMap.get(key) ?? [];
    existing.push({
      id: `task-${task.id}`,
      tone: task.status === "completed" ? "completed" : task.isDelayed ? "delayed" : "pending",
      timeLabel: getChipTime(task.deadline),
      title: task.title,
      sortValue: new Date(task.deadline).getTime(),
    });
    eventMap.set(key, existing);
  }

  for (const items of eventMap.values()) {
    items.sort((left, right) => left.sortValue - right.sortValue);
  }

  const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const currentMonth = getCurrentMonth();
  const today = getManilaParts(new Date());
  const delayedTasks = tasks.filter((task) => task.isDelayed).sort(sortByDateAscending).slice(0, 3);
  const pendingTasks = tasks
    .filter((task) => task.status !== "completed" && !task.isDelayed)
    .sort(sortByDateAscending)
    .slice(0, 3);
  const completedTasks = tasks.filter((task) => task.status === "completed").sort(sortByActivityDescending).slice(0, 4);

  const cells = Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - firstWeekday + 1;
    if (dayNumber <= 0 || dayNumber > daysInMonth) {
      return { key: `empty-${index}`, dayNumber: null as null };
    }

    const dayKey = `${visibleMonth.year}-${`${visibleMonth.month}`.padStart(2, "0")}-${`${dayNumber}`.padStart(2, "0")}`;
    const isToday =
      visibleMonth.year === currentMonth.year &&
      visibleMonth.month === currentMonth.month &&
      dayNumber === today.day;

    return {
      key: dayKey,
      dayNumber,
      items: eventMap.get(dayKey) ?? [],
      isToday,
    };
  });

  const shiftMonth = (offset: number) => {
    setVisibleMonth((current) => {
      const nextMonthIndex = current.month - 1 + offset;
      const year = current.year + Math.floor(nextMonthIndex / 12);
      const month = ((nextMonthIndex % 12) + 12) % 12 + 1;
      return { year, month };
    });
  };

  const renderTaskCard = (title: string, tone: "delays" | "pending" | "completed", items: TaskItem[], emptyText: string) => {
    const labelStyles: Record<typeof tone, React.CSSProperties> = {
      delays: {
        color: "#991b1b",
        background: "rgba(254, 202, 202, 0.95)",
      },
      pending: {
        color: "#92400e",
        background: "rgba(254, 240, 138, 0.95)",
      },
      completed: {
        color: "#166534",
        background: "rgba(187, 247, 208, 0.95)",
      },
    };

    return (
      <section className="page-card admin-status-card">
        <div
          className={`admin-status-label admin-status-label-${tone}`}
          style={{
            display: "inline-flex",
            padding: "6px 12px",
            borderRadius: "10px",
            fontWeight: 900,
            ...labelStyles[tone],
          }}
        >
          {title}
        </div>

        {items.length ? (
          <div className="admin-status-list" style={{ display: "grid", gap: 0, marginTop: "14px" }}>
            {items.map((task) => (
              <article
                className="admin-status-item"
                key={task.id}
                style={{ display: "grid", gap: "4px", padding: "12px 0", borderBottom: "1px solid rgba(148, 163, 184, 0.16)" }}
              >
                <strong style={{ color: "#0f172a", fontSize: "1rem", fontWeight: 800 }}>{task.title}</strong>
                <span style={{ color: "#64748b", fontSize: "0.88rem", fontWeight: 700 }}>
                  {task.dueLabel} - {taskWorkflowLabel(task)}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-status-empty" style={{ marginTop: "14px", color: "#64748b", fontSize: "0.88rem", fontWeight: 700 }}>
            {emptyText}
          </div>
        )}

        {tone === "completed" ? (
          <Link
            className="admin-view-link"
            href="/admin/tasks"
            style={{
              display: "inline-flex",
              marginTop: "10px",
              padding: "6px 10px",
              border: "1px solid rgba(59, 130, 246, 0.55)",
              borderRadius: "8px",
              color: "#2563eb",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            View all
          </Link>
        ) : null}
      </section>
    );
  };

  return (
    <div className="admin-overview-scroll" style={overviewScrollStyle}>
      <div className="page-grid two-col admin-overview-grid" style={overviewGridStyle}>
        <section className="page-card admin-calendar-shell" aria-label="Admin dashboard calendar" style={calendarShellStyle}>
          <div className="admin-calendar-toolbar" style={toolbarStyle}>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.9rem", fontWeight: 500 }}>Calendar Overview</h3>
            <div className="admin-month-switch" style={monthSwitchStyle}>
              <button
                type="button"
                className="admin-month-nav"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                style={monthNavStyle}
              >
                {"\u2039"}
              </button>
              <span>{getMonthLabel(visibleMonth.year, visibleMonth.month)}</span>
              <button
                type="button"
                className="admin-month-nav"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                style={monthNavStyle}
              >
                {"\u203A"}
              </button>
            </div>
          </div>

          <div className="admin-weekdays" style={weekdayGridStyle}>
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} style={{ padding: "0 8px" }}>
                {label}
              </span>
            ))}
          </div>

          <div className="admin-month-grid" style={monthGridStyle}>
            {cells.map((cell) =>
              cell.dayNumber ? (
                <article
                  className={`admin-calendar-cell${cell.isToday ? " is-today" : ""}`}
                  key={cell.key}
                  style={{
                    display: "flex",
                    minHeight: "92px",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "8px",
                    border: cell.isToday ? "1px solid rgba(59, 130, 246, 0.65)" : "1px solid rgba(148, 163, 184, 0.18)",
                    borderRadius: "12px",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,252,0.98))",
                    boxShadow: cell.isToday ? "inset 0 0 0 1px rgba(59, 130, 246, 0.22)" : "0 10px 20px rgba(15, 23, 42, 0.07)",
                  }}
                >
                  <div className="admin-calendar-date" style={{ color: "#0f172a", fontWeight: 900 }}>
                    {cell.dayNumber}
                  </div>
                  <div className="admin-calendar-events" style={{ display: "grid", gap: "6px" }}>
                    {cell.items.slice(0, 2).map((item) => (
                      <span
                        className={`admin-calendar-chip admin-calendar-chip-${item.tone}`}
                        key={item.id}
                        title={item.title}
                        style={{
                          display: "inline-flex",
                          width: "100%",
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          lineHeight: 1.2,
                          color:
                            item.tone === "delayed"
                              ? "#b91c1c"
                              : item.tone === "completed"
                                ? "#1d4ed8"
                                : "#166534",
                          background:
                            item.tone === "delayed"
                              ? "rgba(254, 202, 202, 0.95)"
                              : item.tone === "completed"
                                ? "rgba(191, 219, 254, 0.95)"
                                : "rgba(187, 247, 208, 0.95)",
                        }}
                      >
                        {item.timeLabel} ...
                      </span>
                    ))}
                    {cell.items.length > 2 ? (
                      <span className="admin-calendar-more" style={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>
                        +{cell.items.length - 2} more
                      </span>
                    ) : null}
                  </div>
                </article>
              ) : (
                <div
                  className="admin-calendar-cell admin-calendar-cell-empty"
                  key={cell.key}
                  style={{
                    minHeight: "92px",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    borderRadius: "12px",
                    opacity: 0.45,
                  }}
                />
              ),
            )}
          </div>
        </section>

        <div className="admin-side-stack" style={sideStackStyle}>
          {renderTaskCard("Delays", "delays", delayedTasks, "No delayed tasks right now.")}
          {renderTaskCard("Pending Tasks", "pending", pendingTasks, "No pending tasks right now.")}
          <div style={{ marginTop: "auto" }}>
            {renderTaskCard("Completed", "completed", completedTasks, "No completed tasks yet.")}
          </div>
        </div>
      </div>
    </div>
  );
}
