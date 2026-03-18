"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DASHBOARD_CALENDAR_FILTER_EVENT,
  DASHBOARD_CALENDAR_VIEW_EVENT,
  defaultDashboardCalendarFilters,
  type DashboardCalendarFilters,
  type DashboardCalendarView,
} from "@/lib/dashboard-calendar-filters";
import type { MeetingItem, TaskItem } from "@/lib/ttcs-data";

const MANILA_TZ = "Asia/Manila";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarItem = {
  id: string;
  kind: "meeting" | "task";
  title: string;
  timeLabel: string;
  sortValue: number;
  tone: "meeting" | "pending" | "delayed" | "completed";
  taskId?: number;
};

function getManilaParts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 1),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 1),
  };
}

function getCurrentMonth() {
  const parts = getManilaParts(new Date());
  return { year: parts.year, month: parts.month };
}

function getMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function dayKeyFromValue(value: string | Date) {
  const parts = getManilaParts(value);
  return `${parts.year}-${`${parts.month}`.padStart(2, "0")}-${`${parts.day}`.padStart(2, "0")}`;
}

function getChipTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function AdminDashboardCalendar({
  tasks,
  meetings,
  totalTasks,
  completedTasks,
  pendingTasks,
  delayedTasks,
  meetingCount,
}: {
  tasks: TaskItem[];
  meetings: MeetingItem[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  delayedTasks: number;
  meetingCount: number;
}) {
  const router = useRouter();
  const [visibleMonth, setVisibleMonth] = useState(getCurrentMonth);
  const [filters, setFilters] = useState<DashboardCalendarFilters>(defaultDashboardCalendarFilters);

  useEffect(() => {
    const handleFilterChange = (event: Event) => {
      const nextFilters = (event as CustomEvent<DashboardCalendarFilters>).detail;
      if (nextFilters) {
        setFilters(nextFilters);
      }
    };

    const handleViewChange = (event: Event) => {
      const nextView = (event as CustomEvent<DashboardCalendarView>).detail;
      if (nextView) {
        setVisibleMonth({ year: nextView.year, month: nextView.month });
      }
    };

    window.addEventListener(DASHBOARD_CALENDAR_FILTER_EVENT, handleFilterChange as EventListener);
    window.addEventListener(DASHBOARD_CALENDAR_VIEW_EVENT, handleViewChange as EventListener);

    return () => {
      window.removeEventListener(DASHBOARD_CALENDAR_FILTER_EVENT, handleFilterChange as EventListener);
      window.removeEventListener(DASHBOARD_CALENDAR_VIEW_EVENT, handleViewChange as EventListener);
    };
  }, []);

  const eventMap = new Map<string, CalendarItem[]>();

  if (filters.meetings) {
    for (const meeting of meetings) {
      const key = dayKeyFromValue(meeting.dateTime);
      const items = eventMap.get(key) ?? [];
      items.push({
        id: `meeting-${meeting.id}`,
        kind: "meeting",
        title: meeting.title,
        timeLabel: getChipTime(meeting.dateTime),
        sortValue: new Date(meeting.dateTime).getTime(),
        tone: "meeting",
      });
      eventMap.set(key, items);
    }
  }

  for (const task of tasks) {
    if (!task.deadline) {
      continue;
    }

    const shouldShowTask =
      (task.status === "completed" && filters.completed) ||
      (task.status !== "completed" && task.isDelayed && filters.delayed) ||
      (task.status !== "completed" && !task.isDelayed && filters.pending);

    if (!shouldShowTask) {
      continue;
    }

    const key = dayKeyFromValue(task.deadline);
    const items = eventMap.get(key) ?? [];
    items.push({
      id: `task-${task.id}`,
      kind: "task",
      title: task.title,
      timeLabel: getChipTime(task.deadline),
      sortValue: new Date(task.deadline).getTime(),
      tone: task.status === "completed" ? "completed" : task.isDelayed ? "delayed" : "pending",
      taskId: task.id,
    });
    eventMap.set(key, items);
  }

  for (const items of eventMap.values()) {
    items.sort((left, right) => left.sortValue - right.sortValue);
  }

  const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const currentMonth = getCurrentMonth();
  const today = getManilaParts(new Date());

  const cells = Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - firstWeekday + 1;
    if (dayNumber <= 0 || dayNumber > daysInMonth) {
      return null;
    }

    const key = `${visibleMonth.year}-${`${visibleMonth.month}`.padStart(2, "0")}-${`${dayNumber}`.padStart(2, "0")}`;

    return {
      key,
      dayNumber,
      items: eventMap.get(key) ?? [],
      isToday:
        visibleMonth.year === currentMonth.year &&
        visibleMonth.month === currentMonth.month &&
        dayNumber === today.day,
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

  const openTaskDashboard = (taskId: number) => {
    const params = new URLSearchParams({ task: String(taskId), open: "1" });
    router.push(`/admin/tasks?${params.toString()}`);
  };

  const visiblePills = [
    { key: "tasks", count: totalTasks, text: getCountLabel(totalTasks, "task") },
    { key: "completed", count: completedTasks, text: getCountLabel(completedTasks, "completed task", "completed tasks") },
    { key: "pending", count: pendingTasks, text: getCountLabel(pendingTasks, "pending task", "pending tasks") },
    { key: "delayed", count: delayedTasks, text: getCountLabel(delayedTasks, "delayed task", "delayed tasks") },
    { key: "meetings", count: meetingCount, text: getCountLabel(meetingCount, "meeting") },
  ].filter((item) => item.count > 0);

  return (
    <section className="admin-large-calendar" aria-label="Admin month calendar">
      <div className="admin-large-calendar-head">
        <div className="admin-large-calendar-breadcrumb">
          <span className="admin-large-calendar-icon" aria-hidden="true">
            {"\u25A3"}
          </span>
          <span>{getMonthLabel(visibleMonth.year, visibleMonth.month)}</span>
        </div>

        <div className="admin-large-calendar-actions">
          {visiblePills.length ? (
            <div className="admin-large-calendar-counts">
              <span className="admin-large-calendar-pill admin-large-calendar-pill-showing">Showing</span>
              {visiblePills.map((pill) => (
                <span
                  key={pill.key}
                  className={`admin-large-calendar-pill admin-large-calendar-pill-${pill.key}`}
                >
                  {pill.text}
                </span>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="admin-large-calendar-nav"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            {"\u2039"}
          </button>
          <button
            type="button"
            className="admin-large-calendar-nav"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            {"\u203A"}
          </button>
        </div>
      </div>

      <div className="admin-large-calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="admin-large-calendar-grid">
        {cells.map((cell, index) =>
          cell ? (
            <article
              className={`admin-large-calendar-cell${cell.isToday ? " is-today" : ""}`}
              key={cell.key}
            >
              <div className="admin-large-calendar-cell-top">
                <span className="admin-large-calendar-day">{cell.dayNumber}</span>
              </div>

              <div className="admin-large-calendar-cell-body">
                {cell.items.slice(0, 2).map((item) =>
                  item.kind === "task" && typeof item.taskId === "number" ? (
                    <button
                      type="button"
                      className={`admin-large-calendar-chip admin-large-calendar-chip-${item.tone}`}
                      key={item.id}
                      onClick={() => openTaskDashboard(item.taskId)}
                      title={item.title}
                    >
                      <span className="admin-large-calendar-chip-time">{item.timeLabel}</span>
                      <span className="admin-large-calendar-chip-title">{item.title}</span>
                    </button>
                  ) : (
                    <div
                      className={`admin-large-calendar-chip admin-large-calendar-chip-${item.tone} is-static`}
                      key={item.id}
                      title={item.title}
                    >
                      <span className="admin-large-calendar-chip-time">{item.timeLabel}</span>
                      <span className="admin-large-calendar-chip-title">{item.title}</span>
                    </div>
                  ),
                )}

                {cell.items.length > 2 ? (
                  <span className="admin-large-calendar-more">+{cell.items.length - 2} more</span>
                ) : null}
              </div>
            </article>
          ) : (
            <div
              className="admin-large-calendar-cell admin-large-calendar-cell-empty"
              key={`empty-${index}`}
            />
          ),
        )}
      </div>
    </section>
  );
}
