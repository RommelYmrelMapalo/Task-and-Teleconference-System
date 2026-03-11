import type { DashboardDay, MeetingItem, TaskItem } from "@/lib/ttcs-data";

const MANILA_TZ = "Asia/Manila";

function formatWithTz(value: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    ...options,
  }).format(new Date(value));
}

function toManilaDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(
    new Date(value).toLocaleString("en-US", {
      timeZone: MANILA_TZ,
    }),
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildDashboardDays(tasks: TaskItem[], meetings: MeetingItem[]) {
  const byDay = new Map<string, DashboardDay>();
  const today = startOfDay(
    new Date(
      new Date().toLocaleString("en-US", {
        timeZone: MANILA_TZ,
      }),
    ),
  );
  const windowStart = addDays(today, -1);
  const windowEnd = addDays(today, 7);

  const ensureDay = (date: Date) => {
    const id = dayKeyFromDate(date);
    const existing = byDay.get(id);
    if (existing) {
      return existing;
    }

    const offset = Math.round((startOfDay(date).getTime() - today.getTime()) / 86400000);
    const dateSub = formatWithTz(date.toISOString(), {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const created: DashboardDay = {
      id,
      dateLabel:
        offset === -1
          ? "Yesterday"
          : offset === 0
            ? "Today"
            : offset === 1
              ? "Tomorrow"
              : formatWithTz(date.toISOString(), {
                  weekday: "long",
                }),
      dateSub:
        offset >= -1 && offset <= 1
          ? dateSub
          : formatWithTz(date.toISOString(), {
              month: "long",
              day: "numeric",
            }),
      tasks: [],
      meetings: [],
    };

    byDay.set(id, created);
    return created;
  };

  for (let current = new Date(windowStart); current <= windowEnd; current = addDays(current, 1)) {
    ensureDay(current);
  }

  for (const task of tasks) {
    const date = toManilaDate(task.deadline);
    if (!date) {
      continue;
    }

    ensureDay(startOfDay(date)).tasks.push(task);
  }

  for (const meeting of meetings) {
    const date = toManilaDate(meeting.dateTime);
    if (!date) {
      continue;
    }

    ensureDay(startOfDay(date)).meetings.push(meeting);
  }

  return Array.from(byDay.values()).sort((left, right) => left.id.localeCompare(right.id));
}
