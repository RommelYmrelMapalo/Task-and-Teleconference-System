import { redirect } from "next/navigation";
import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { createClient } from "@/app/utils/utils/supabase/server";
import { hasSupabaseEnv } from "@/app/utils/utils/supabase/env";
import { isMissingSupabaseColumn, isMissingSupabaseTable } from "@/lib/supabase-errors";

const MANILA_TZ = "Asia/Manila";

export type AppRole = "user" | "admin";
export type TaskStatus = "assigned" | "in_progress" | "for_revision" | "completed";
export type TaskPriority = "low" | "normal" | "high";

export type TaskAttachment = {
  id: string;
  filename: string;
  mimetype: string | null;
  storagePath: string;
  createdAt: string;
  size: number | null;
  downloadUrl: string | null;
};

export type ProfileRecord = {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  role: AppRole;
  last_login: string | null;
  created_at: string;
};

export type ShellUser = {
  id: string;
  email: string;
  fullName: string;
  initials: string;
  isAdmin: boolean;
  role: AppRole;
  roleLabel: string;
};

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  subject: string;
  preview: string;
  sender: string;
  timeLabel: string;
};

export type MeetingItem = {
  id: number;
  title: string;
  description: string;
  room: string;
  dateTime: string;
  dateLabel: string;
  timeLabel: string;
};

export type TaskAuditLogItem = {
  id: number;
  actorName: string;
  taskTitle: string;
  action: string;
  details: string;
  createdAt: string;
  createdLabel: string;
};

export type TaskItem = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  previousStatus?: Exclude<TaskStatus, "completed"> | null;
  priority: TaskPriority;
  deadline: string | null;
  createdAt: string;
  activityAt: string;
  dueLabel: string;
  dueTimeLabel: string;
  createdLabel: string;
  activityLabel: string;
  createdByLabel: string;
  lastEditedByLabel: string;
  isDelayed: boolean;
  assignees: ShellUser[];
  attachments: TaskAttachment[];
};

export type DashboardDay = {
  id: string;
  dateLabel: string;
  dateSub?: string;
  tasks: TaskItem[];
  meetings: MeetingItem[];
};

type SessionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: ProfileRecord;
  shellUser: ShellUser;
  unreadCount: number;
};

type AssignmentRow = {
  task_id: number;
  user_id: string;
};

type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  created_by: string | null;
  last_edited_by: string | null;
  created_at: string;
  last_edited_at: string;
};

type LegacyTaskRow = Omit<TaskRow, "created_by">;

type AttachmentRow = {
  id: number;
  task_id: number;
  filename: string;
  mimetype: string | null;
  storage_path: string;
  created_at: string;
};

type TaskAuditLogRow = {
  id: number;
  actor_user_id: string;
  task_id: number;
  action: string;
  details: string | null;
  created_at: string;
};

type AttachmentStorageInfo = {
  size?: number | string | null;
  metadata?: {
    size?: number | string | null;
  } | null;
};

type NotificationRow = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function hasCreatedBy(row: TaskRow | LegacyTaskRow): row is TaskRow {
  return "created_by" in row && (typeof row.created_by === "string" || row.created_by === null);
}

function normalizeTaskRows(rows: TaskRow[] | LegacyTaskRow[] | null | undefined): TaskRow[] {
  return (rows ?? []).map((row) => ({
    ...row,
    created_by: hasCreatedBy(row) ? row.created_by : null,
  }));
}

function parseStorageLocation(storagePath: string) {
  const normalized = storagePath.replace(/^\/+/, "");
  const slashIndex = normalized.indexOf("/");

  if (slashIndex <= 0 || slashIndex === normalized.length - 1) {
    return null;
  }

  return {
    bucket: normalized.slice(0, slashIndex),
    path: normalized.slice(slashIndex + 1),
  };
}

function parseAttachmentSize(value: number | string | null | undefined) {
  const numericValue = typeof value === "string" ? Number(value) : value;
  return typeof numericValue === "number" && Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
}

async function resolveStoredAttachment(
  storagePath: string,
) {
  if (/^(https?:|data:|blob:)/i.test(storagePath)) {
    return {
      downloadUrl: storagePath,
      size: null,
    };
  }

  const location = parseStorageLocation(storagePath);
  if (!location) {
    return {
      downloadUrl: null,
      size: null,
    };
  }

  const signingClient = createAdminClient();
  const storageBucket = signingClient.storage.from(location.bucket) as typeof signingClient.storage.from extends (
    bucket: string,
  ) => infer T
    ? T & {
        info?: (path: string) => Promise<{ data: AttachmentStorageInfo | null; error: { message: string } | null }>;
      }
    : never;
  const signedResult = await signingClient.storage.from(location.bucket).createSignedUrl(location.path, 60 * 60);
  let size: number | null = null;

  if (typeof storageBucket.info === "function") {
    const infoResult = await storageBucket.info(location.path);
    if (!infoResult.error) {
      size = parseAttachmentSize(infoResult.data?.metadata?.size ?? infoResult.data?.size);
    }
  }

  if (!signedResult.error && signedResult.data?.signedUrl) {
    return {
      downloadUrl: signedResult.data.signedUrl,
      size,
    };
  }

  const publicResult = signingClient.storage.from(location.bucket).getPublicUrl(location.path);
  return {
    downloadUrl: publicResult.data.publicUrl || null,
    size,
  };
}

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

function initialsFromName(fullName: string) {
  const parts = fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "TT";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function formatDisplayName(fullName: string) {
  return fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim() ?? "";
  if (!localPart) {
    return "TTCS User";
  }

  const normalized = localPart
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

  return formatDisplayName(normalized || localPart);
}

function resolveProfileName(fullName: string | null | undefined, email: string) {
  const trimmedName = fullName?.trim() ?? "";
  const trimmedEmail = email.trim();

  if (trimmedName && !trimmedName.includes("@")) {
    return formatDisplayName(trimmedName);
  }

  if (trimmedName && trimmedEmail && trimmedName.toLowerCase() !== trimmedEmail.toLowerCase()) {
    return formatDisplayName(trimmedName);
  }

  if (trimmedEmail) {
    return deriveNameFromEmail(trimmedEmail);
  }

  return "TTCS User";
}

function buildShellUser(profile: ProfileRecord): ShellUser {
  const normalizedName = resolveProfileName(profile.full_name, profile.email);

  return {
    id: profile.id,
    email: profile.email,
    fullName: normalizedName,
    initials: initialsFromName(normalizedName),
    isAdmin: profile.is_admin,
    role: profile.role,
    roleLabel: profile.is_admin ? "Admin" : "User",
  };
}

function fallbackProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const fullName = resolveProfileName(
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    user.email || "",
  );

  return {
    id: user.id,
    email: user.email || "",
    full_name: fullName,
    is_admin: false,
    role: "user" as const,
    last_login: null,
    created_at: new Date().toISOString(),
  };
}

async function getProfileRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,is_admin,role,last_login,created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return fallbackProfile(user);
    }
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return (data as ProfileRecord | null) ?? fallbackProfile(user);
}

async function getUnreadCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return 0;
    }
    throw new Error(`Failed to load unread notifications: ${error.message}`);
  }

  return count ?? 0;
}

export async function getOptionalSessionContext() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getProfileRecord(supabase, user);
  const unreadCount = await getUnreadCount(supabase, profile.id);

  return {
    supabase,
    profile,
    shellUser: buildShellUser(profile),
    unreadCount,
  };
}

export async function requireSessionContext(options?: { admin?: boolean }): Promise<SessionContext> {
  const isAdminPage = options?.admin ?? false;

  if (!hasSupabaseEnv()) {
    redirect(isAdminPage ? "/admin/login" : "/");
  }

  const context = await getOptionalSessionContext();

  if (!context) {
    redirect(isAdminPage ? "/admin/login" : "/");
  }

  if (isAdminPage && !context.profile.is_admin) {
    redirect("/dashboard");
  }

  return context;
}

function mapNotificationRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
    subject: row.title,
    preview: row.message,
    sender: row.title.toLowerCase().includes("system") ? "System" : "TTCS",
    timeLabel: formatWithTz(row.created_at, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function formatAuditAction(action: string) {
  if (action === "unassigned_task_edit") {
    return "Unassigned task edit";
  }

  if (action === "unassigned_task_completion") {
    return "Unassigned task completion";
  }

  if (action === "unassigned_task_restore") {
    return "Unassigned task restore";
  }

  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapAttachmentRow(row: AttachmentRow, downloadUrl: string | null, size: number | null): TaskAttachment {
  return {
    id: String(row.id),
    filename: row.filename,
    mimetype: row.mimetype,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    size,
    downloadUrl,
  };
}

function mapTaskRow(
  row: TaskRow,
  assignees: ShellUser[] = [],
  attachments: TaskAttachment[] = [],
  createdBy?: ShellUser | null,
  lastEditedBy?: ShellUser | null,
): TaskItem {
  const deadlineDate = row.deadline ? new Date(row.deadline) : null;
  const isDelayed = Boolean(deadlineDate && row.status !== "completed" && deadlineDate.getTime() < Date.now());
  const lastEditedByLabel = lastEditedBy?.fullName ?? "Unknown user";
  const createdByLabel = createdBy?.fullName ?? "Unknown user";

  return {
    id: row.id,
    title: row.title,
    description: row.description || "No description provided.",
    status: row.status,
    priority: row.priority,
    deadline: row.deadline,
    createdAt: row.created_at,
    activityAt: row.last_edited_at || row.created_at,
    dueLabel: row.deadline
      ? formatWithTz(row.deadline, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "No deadline",
    dueTimeLabel: row.deadline
      ? formatWithTz(row.deadline, {
          hour: "numeric",
          minute: "2-digit",
        })
      : "No due time",
    createdLabel: formatWithTz(row.created_at, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    activityLabel: formatWithTz(row.last_edited_at || row.created_at, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    createdByLabel,
    lastEditedByLabel,
    isDelayed,
    assignees,
    attachments,
  };
}

async function getTaskAttachmentsByTaskId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskIds: number[],
) {
  if (!taskIds.length) {
    return new Map<number, TaskAttachment[]>();
  }

  const { data, error } = await supabase
    .from("task_attachments")
    .select("id,task_id,filename,mimetype,storage_path,created_at")
    .in("task_id", taskIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return new Map<number, TaskAttachment[]>();
    }
    throw new Error(`Failed to load task attachments: ${error.message}`);
  }

  const rows = (data as AttachmentRow[] | null) ?? [];
  const rowsWithAttachments = await Promise.all(
    rows.map(async (row) => ({
      row,
      ...(await resolveStoredAttachment(row.storage_path)),
    })),
  );
  const attachmentsByTask = new Map<number, TaskAttachment[]>();

  for (const { row, downloadUrl, size } of rowsWithAttachments) {
    const existing = attachmentsByTask.get(row.task_id) ?? [];
    existing.push(mapAttachmentRow(row, downloadUrl, size));
    attachmentsByTask.set(row.task_id, existing);
  }

  return attachmentsByTask;
}

export async function getUserNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  limit?: number,
) {
  let query = supabase
    .from("notifications")
    .select("id,title,message,is_read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return [];
    }
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  return ((data as NotificationRow[] | null) ?? []).map(mapNotificationRow);
}

export async function getAllNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit?: number,
) {
  let query = supabase
    .from("notifications")
    .select("id,title,message,is_read,created_at")
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return [];
    }
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  return ((data as NotificationRow[] | null) ?? []).map(mapNotificationRow);
}

export async function getAdminTaskAuditLogs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit = 50,
) {
  let query = supabase
    .from("task_audit_logs")
    .select("id,actor_user_id,task_id,action,details,created_at")
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return [];
    }
    throw new Error(`Failed to load task audit logs: ${error.message}`);
  }

  const rows = (data as TaskAuditLogRow[] | null) ?? [];
  if (!rows.length) {
    return [];
  }

  const actorIds = unique(rows.map((row) => row.actor_user_id));
  const taskIds = unique(rows.map((row) => row.task_id));
  const actorMap = new Map<string, ShellUser>();
  const taskTitleMap = new Map<number, string>();

  if (actorIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,is_admin,role,last_login,created_at")
      .in("id", actorIds);

    if (profileError && !isMissingSupabaseTable(profileError)) {
      throw new Error(`Failed to load task audit actors: ${profileError.message}`);
    }

    for (const profile of (profiles as ProfileRecord[] | null) ?? []) {
      actorMap.set(profile.id, buildShellUser(profile));
    }
  }

  if (taskIds.length) {
    const { data: tasks, error: taskError } = await supabase.from("tasks").select("id,title").in("id", taskIds);

    if (taskError && !isMissingSupabaseTable(taskError)) {
      throw new Error(`Failed to load task audit tasks: ${taskError.message}`);
    }

    for (const task of ((tasks as Array<{ id: number; title: string }> | null) ?? [])) {
      taskTitleMap.set(task.id, task.title);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    actorName: actorMap.get(row.actor_user_id)?.fullName ?? "Unknown user",
    taskTitle: taskTitleMap.get(row.task_id) ?? `Task #${row.task_id}`,
    action: formatAuditAction(row.action),
    details: row.details ?? "No additional details.",
    createdAt: row.created_at,
    createdLabel: formatWithTz(row.created_at, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  }));
}

export function getMeetingItems(notifications: NotificationItem[]) {
  return notifications
    .filter((item) => `${item.title} ${item.message}`.toLowerCase().includes("meeting"))
    .map((item) => ({
      id: item.id,
      title: item.title || "Meeting",
      description: item.message,
      room: "",
      dateTime: item.createdAt,
      dateLabel: formatWithTz(item.createdAt, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      timeLabel: formatWithTz(item.createdAt, {
        hour: "numeric",
        minute: "2-digit",
      }),
    }));
}

export async function getUserTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: assignments, error: assignmentError } = await supabase
    .from("task_assignments")
    .select("task_id")
    .eq("user_id", userId);

  if (assignmentError) {
    if (isMissingSupabaseTable(assignmentError)) {
      return [];
    }
    throw new Error(`Failed to load task assignments: ${assignmentError.message}`);
  }

  const taskIds = unique(((assignments as Array<{ task_id: number }> | null) ?? []).map((item) => item.task_id));

  if (!taskIds.length) {
    return [];
  }

  let { data, error } = await supabase
    .from("tasks")
    .select("id,title,description,status,priority,deadline,created_by,last_edited_by,created_at,last_edited_at")
    .in("id", taskIds)
    .order("created_at", { ascending: false });

  if (error && isMissingSupabaseColumn(error, "created_by")) {
    const fallbackResult = await supabase
      .from("tasks")
      .select("id,title,description,status,priority,deadline,last_edited_by,created_at,last_edited_at")
      .in("id", taskIds)
      .order("created_at", { ascending: false });

    data = normalizeTaskRows(fallbackResult.data as LegacyTaskRow[] | null);
    error = fallbackResult.error;
  }

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return [];
    }
    throw new Error(`Failed to load tasks: ${error.message}`);
  }

  const taskRows = normalizeTaskRows(data as TaskRow[] | LegacyTaskRow[] | null);
  const attachmentsByTask = await getTaskAttachmentsByTaskId(supabase, taskRows.map((task) => task.id));
  const profileIds = unique(
    [
      userId,
      ...taskRows.map((task) => task.created_by).filter((value): value is string => Boolean(value)),
      ...taskRows.map((task) => task.last_edited_by).filter((value): value is string => Boolean(value)),
    ],
  );
  const profileMap = new Map<string, ShellUser>();

  if (profileIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,is_admin,role,last_login,created_at")
      .in("id", profileIds);

    if (profileError) {
      if (isMissingSupabaseTable(profileError)) {
        return taskRows.map((item) => mapTaskRow(item, [], attachmentsByTask.get(item.id) ?? []));
      }
      throw new Error(`Failed to load task profiles: ${profileError.message}`);
    }

    for (const profile of (profiles as ProfileRecord[] | null) ?? []) {
      profileMap.set(profile.id, buildShellUser(profile));
    }
  }

  return taskRows.map((item) =>
    mapTaskRow(
      item,
      [],
      attachmentsByTask.get(item.id) ?? [],
      item.created_by ? profileMap.get(item.created_by) ?? null : null,
      item.last_edited_by ? profileMap.get(item.last_edited_by) ?? null : null,
    ),
  );
}

export async function getAdminTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  let { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("id,title,description,status,priority,deadline,created_by,last_edited_by,created_at,last_edited_at")
    .order("created_at", { ascending: false });

  if (taskError && isMissingSupabaseColumn(taskError, "created_by")) {
    const fallbackResult = await supabase
      .from("tasks")
      .select("id,title,description,status,priority,deadline,last_edited_by,created_at,last_edited_at")
      .order("created_at", { ascending: false });

    taskRows = normalizeTaskRows(fallbackResult.data as LegacyTaskRow[] | null);
    taskError = fallbackResult.error;
  }

  if (taskError) {
    if (isMissingSupabaseTable(taskError)) {
      return [];
    }
    throw new Error(`Failed to load admin tasks: ${taskError.message}`);
  }

  const tasks = normalizeTaskRows(taskRows as TaskRow[] | LegacyTaskRow[] | null);
  const taskIds = tasks.map((task) => task.id);
  const attachmentsByTask = await getTaskAttachmentsByTaskId(supabase, taskIds);

  let assignmentRows: AssignmentRow[] = [];
  if (taskIds.length) {
    const { data, error } = await supabase
      .from("task_assignments")
      .select("task_id,user_id")
      .in("task_id", taskIds);

    if (error) {
      if (isMissingSupabaseTable(error)) {
        return tasks.map((task) => mapTaskRow(task, [], attachmentsByTask.get(task.id) ?? []));
      }
      throw new Error(`Failed to load admin task assignments: ${error.message}`);
    }

    assignmentRows = (data as AssignmentRow[] | null) ?? [];
  }

  const userIds = unique([
    ...assignmentRows.map((item) => item.user_id),
    ...tasks.map((task) => task.created_by).filter((value): value is string => Boolean(value)),
    ...tasks.map((task) => task.last_edited_by).filter((value): value is string => Boolean(value)),
  ]);
  let profiles: ProfileRecord[] = [];
  if (userIds.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,is_admin,role,last_login,created_at")
      .in("id", userIds);

    if (error) {
      if (isMissingSupabaseTable(error)) {
        return tasks.map((task) => mapTaskRow(task, [], attachmentsByTask.get(task.id) ?? []));
      }
      throw new Error(`Failed to load assignee profiles: ${error.message}`);
    }

    profiles = (data as ProfileRecord[] | null) ?? [];
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, buildShellUser(profile)]));
  const assignmentsByTask = new Map<number, ShellUser[]>();

  for (const assignment of assignmentRows) {
    const assignee = profileMap.get(assignment.user_id);
    if (!assignee) {
      continue;
    }

    const existing = assignmentsByTask.get(assignment.task_id) ?? [];
    existing.push(assignee);
    assignmentsByTask.set(assignment.task_id, existing);
  }

  return tasks.map((task) =>
    mapTaskRow(
      task,
      assignmentsByTask.get(task.id) ?? [],
      attachmentsByTask.get(task.id) ?? [],
      task.created_by ? profileMap.get(task.created_by) ?? null : null,
      task.last_edited_by ? profileMap.get(task.last_edited_by) ?? null : null,
    ),
  );
}

export async function getVisibleTasks() {
  const admin = createAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  return getAdminTasks(admin);
}

export async function getAllProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,is_admin,role,last_login,created_at")
    .order("is_admin", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return [];
    }
    throw new Error(`Failed to load profiles: ${error.message}`);
  }

  return ((data as ProfileRecord[] | null) ?? []).map((profile) => ({
    ...buildShellUser(profile),
    lastLoginLabel: profile.last_login
      ? formatWithTz(profile.last_login, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Never",
    createdLabel: formatWithTz(profile.created_at, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));
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
      dateSub: offset >= -1 && offset <= 1 ? dateSub : formatWithTz(date.toISOString(), {
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
