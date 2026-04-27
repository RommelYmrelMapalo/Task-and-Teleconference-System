import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { isMissingSupabaseColumn, isMissingSupabaseTable } from "@/lib/supabase-errors";

const MANILA_TZ = "Asia/Manila";
const UPCOMING_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const UPCOMING_REMINDER_MIN_AGE_MS = 60 * 60 * 1000;

type ReminderTaskRow = {
  id: number;
  title: string;
  deadline: string | null;
  priority: "low" | "normal" | "high";
  status: string;
  created_at: string;
};

type AssignmentRow = {
  task_id: number;
  user_id: string;
};

type ExistingNotificationRow = {
  user_id: string;
  thread_key: string | null;
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function formatWithTz(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    ...options,
  }).format(new Date(value));
}

function formatPriority(priority: ReminderTaskRow["priority"]) {
  return priority
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildReminderThreadKey(taskId: number, kind: "upcoming" | "overdue", deadline: string) {
  return `task-reminder:${taskId}:${kind}:${deadline}`;
}

function buildReminderTitle(taskTitle: string, kind: "upcoming" | "overdue") {
  return kind === "overdue" ? `Task Overdue: ${taskTitle}` : `Task Deadline Reminder: ${taskTitle}`;
}

function buildReminderMessage(task: ReminderTaskRow, kind: "upcoming" | "overdue") {
  const dueLabel = task.deadline
    ? formatWithTz(task.deadline, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "No deadline";
  const opener =
    kind === "overdue"
      ? `Your task "${task.title}" is now overdue.`
      : `Your task "${task.title}" is approaching its deadline.`;

  return [
    opener,
    `Due: ${dueLabel}`,
    `Priority: ${formatPriority(task.priority)}`,
    "",
    kind === "overdue"
      ? "Please update the task or coordinate with the task owner as soon as possible."
      : "Please review the task and make sure the remaining work is on track.",
  ].join("\n");
}

export async function syncAutomaticTaskReminders() {
  const admin = createAdminClient();
  const now = new Date();
  const upcomingWindowIso = new Date(now.getTime() + UPCOMING_REMINDER_WINDOW_MS).toISOString();

  const { data: taskData, error: taskError } = await admin
    .from("tasks")
    .select("id,title,deadline,priority,status,created_at")
    .not("deadline", "is", null)
    .neq("status", "completed")
    .lte("deadline", upcomingWindowIso);

  if (taskError) {
    if (isMissingSupabaseTable(taskError)) {
      return;
    }

    throw new Error(`Failed to load reminder candidates: ${taskError.message}`);
  }

  const tasks = (taskData as ReminderTaskRow[] | null) ?? [];
  if (!tasks.length) {
    return;
  }

  const taskIds = tasks.map((task) => task.id);
  const assignmentResult = await admin
    .from("task_assignments")
    .select("task_id,user_id")
    .in("task_id", taskIds);

  if (assignmentResult.error) {
    if (isMissingSupabaseTable(assignmentResult.error)) {
      return;
    }

    throw new Error(`Failed to load reminder assignees: ${assignmentResult.error.message}`);
  }

  const assignments = (assignmentResult.data as AssignmentRow[] | null) ?? [];
  if (!assignments.length) {
    return;
  }

  const assigneesByTask = new Map<number, string[]>();
  for (const assignment of assignments) {
    const existing = assigneesByTask.get(assignment.task_id) ?? [];
    existing.push(assignment.user_id);
    assigneesByTask.set(assignment.task_id, existing);
  }

  const candidates = tasks.flatMap((task) => {
    if (!task.deadline) {
      return [];
    }

    const deadlineTime = new Date(task.deadline).getTime();
    if (!Number.isFinite(deadlineTime)) {
      return [];
    }

    const taskAgeMs = now.getTime() - new Date(task.created_at).getTime();
    const reminderKind =
      deadlineTime < now.getTime()
        ? "overdue"
        : deadlineTime - now.getTime() <= UPCOMING_REMINDER_WINDOW_MS && taskAgeMs >= UPCOMING_REMINDER_MIN_AGE_MS
          ? "upcoming"
          : null;

    if (!reminderKind) {
      return [];
    }

    return (assigneesByTask.get(task.id) ?? []).map((userId) => {
      const threadKey = buildReminderThreadKey(task.id, reminderKind, task.deadline as string);
      return {
        user_id: userId,
        sender_user_id: null,
        thread_key: threadKey,
        task_id: task.id,
        title: buildReminderTitle(task.title, reminderKind),
        message: buildReminderMessage(task, reminderKind),
        dedupeKey: `${userId}:${threadKey}`,
      };
    });
  });

  if (!candidates.length) {
    return;
  }

  const userIds = unique(candidates.map((candidate) => candidate.user_id));
  const threadKeys = unique(candidates.map((candidate) => candidate.thread_key));
  const existingResult = await admin
    .from("notifications")
    .select("user_id,thread_key")
    .in("user_id", userIds)
    .in("thread_key", threadKeys);

  if (existingResult.error) {
    if (
      isMissingSupabaseTable(existingResult.error) ||
      isMissingSupabaseColumn(existingResult.error, "thread_key") ||
      isMissingSupabaseColumn(existingResult.error, "sender_user_id") ||
      isMissingSupabaseColumn(existingResult.error, "task_id")
    ) {
      return;
    }

    throw new Error(`Failed to load existing reminders: ${existingResult.error.message}`);
  }

  const existingNotifications = (existingResult.data as ExistingNotificationRow[] | null) ?? [];
  const existingKeys = new Set(
    existingNotifications.map((row) => `${row.user_id}:${row.thread_key ?? ""}`),
  );
  const rowsToInsert = candidates
    .filter((candidate) => !existingKeys.has(candidate.dedupeKey))
    .map((candidate) => ({
      user_id: candidate.user_id,
      sender_user_id: candidate.sender_user_id,
      thread_key: candidate.thread_key,
      task_id: candidate.task_id,
      title: candidate.title,
      message: candidate.message,
    }));

  if (!rowsToInsert.length) {
    return;
  }

  const insertResult = await admin.from("notifications").insert(rowsToInsert);
  if (insertResult.error) {
    if (
      isMissingSupabaseTable(insertResult.error) ||
      isMissingSupabaseColumn(insertResult.error, "thread_key") ||
      isMissingSupabaseColumn(insertResult.error, "sender_user_id") ||
      isMissingSupabaseColumn(insertResult.error, "task_id")
    ) {
      return;
    }

    throw new Error(`Failed to store automatic reminders: ${insertResult.error.message}`);
  }
}
