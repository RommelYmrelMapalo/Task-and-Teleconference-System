import { redirect } from "next/navigation";
import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { createClient } from "@/app/utils/utils/supabase/server";
import { hasSupabaseEnv } from "@/app/utils/utils/supabase/env";
import { syncAutomaticTaskReminders } from "@/lib/task-reminder-service";
import { cleanupExpiredTasks } from "@/lib/task-retention";
import { isMissingSupabaseColumn, isMissingSupabaseTable, normalizeEmailAddress } from "@/lib/supabase-errors";

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

export type TaskCommentItem = {
  id: number;
  taskId: number;
  body: string;
  createdAt: string;
  createdLabel: string;
  authorId: string;
  authorLabel: string;
  authorInitials: string;
  authorRoleLabel: string;
  isAdmin: boolean;
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

export type AdminProfileListItem = ShellUser & {
  createdAt: string;
  createdLabel: string;
  joinedLabel: string;
  lastLoginAt: string | null;
  lastLoginLabel: string;
  lastActiveLabel: string;
  username: string;
  statusLabel: "Active" | "Inactive" | "Pending" | "Deactivated";
  statusTone: "active" | "inactive" | "pending" | "deactivated";
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

export type MonitoringNotificationItem = NotificationItem & {
  recipientLabel: string;
  senderLabel: string;
  isReply: boolean;
  taskId: number | null;
  threadKey: string | null;
};

export type InboxMessageItem = {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  timeLabel: string;
  isRead: boolean;
  isOutgoing: boolean;
  senderLabel: string;
  senderInitials: string;
};

export type InboxThreadItem = {
  id: string;
  subject: string;
  preview: string;
  updatedAt: string;
  timeLabel: string;
  unreadCount: number;
  messages: InboxMessageItem[];
  counterpartLabel: string;
  counterpartMeta: string;
  canReply: boolean;
  taskId: number | null;
  creatorLabel: string;
  threadType: "task_notification" | "meeting" | "conversation";
  isTrashed: boolean;
  trashExpiresAt: string | null;
  trashExpiresLabel: string | null;
};

export type MeetingItem = {
  id: number;
  title: string;
  description: string;
  room: string;
  joinPath: string;
  videoRoomCode: string;
  dateTime: string;
  endDateTime: string | null;
  dateLabel: string;
  timeLabel: string;
  endTimeLabel: string;
  createdAt: string;
  createdById: string | null;
  createdByLabel: string;
  assignees: ShellUser[];
};

export type MeetingAttendanceItem = {
  meetingId: number;
  meetingTitle: string;
  meetingDateLabel: string;
  meetingTimeLabel: string;
  meetingStartsAt: string;
  meetingEndsAt: string | null;
  roomLabel: string;
  joinPath: string;
  joinedAt: string | null;
  leftAt: string | null;
  joinedLabel: string;
  leftLabel: string;
  statusLabel: "Waiting to Join" | "In Call" | "Completed" | "Missed" | "Closed";
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
  archivedAt: string | null;
  archivedLabel: string;
  createdByLabel: string;
  lastEditedByLabel: string;
  isDelayed: boolean;
  assignees: ShellUser[];
  attachments: TaskAttachment[];
  comments: TaskCommentItem[];
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
  archived_at: string | null;
  created_at: string;
  last_edited_at: string;
};

type PartialTaskRow = Omit<TaskRow, "created_by" | "archived_at"> & {
  created_by?: string | null;
  archived_at?: string | null;
};

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

type TaskCommentRow = {
  id: number;
  task_id: number;
  body: string;
  author_user_id: string;
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

type InboxNotificationRow = NotificationRow & {
  user_id: string;
  sender_user_id: string | null;
  thread_key: string | null;
  task_id: number | null;
};

type InboxThreadStateRow = {
  user_id: string;
  thread_key: string;
  trashed_at: string | null;
  deleted_before: string | null;
  updated_at: string;
};

const INBOX_TRASH_RETENTION_DAYS = 31;

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function normalizeTaskRows(rows: PartialTaskRow[] | null | undefined): TaskRow[] {
  return (rows ?? []).map((row) => ({
    ...row,
    created_by: typeof row.created_by === "string" || row.created_by === null ? row.created_by : null,
    archived_at: typeof row.archived_at === "string" || row.archived_at === null ? row.archived_at : null,
  }));
}

function buildTaskSelectQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    taskIds,
    archived = false,
    includeCreatedBy = true,
    includeArchivedAt = true,
  }: {
    taskIds?: number[];
    archived?: boolean;
    includeCreatedBy?: boolean;
    includeArchivedAt?: boolean;
  },
) {
  const columns = [
    "id",
    "title",
    "description",
    "status",
    "priority",
    "deadline",
    includeCreatedBy ? "created_by" : null,
    "last_edited_by",
    includeArchivedAt ? "archived_at" : null,
    "created_at",
    "last_edited_at",
  ]
    .filter(Boolean)
    .join(",");

  let query = supabase.from("tasks").select(columns);

  if (taskIds?.length) {
    query = query.in("id", taskIds);
  }

  if (includeArchivedAt) {
    query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  }

  return query.order(archived && includeArchivedAt ? "archived_at" : "created_at", { ascending: false });
}

async function fetchTaskRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    taskIds,
    archived = false,
  }: {
    taskIds?: number[];
    archived?: boolean;
  } = {},
) {
  let includeCreatedBy = true;
  let includeArchivedAt = true;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await buildTaskSelectQuery(supabase, {
      taskIds,
      archived,
      includeCreatedBy,
      includeArchivedAt,
    });

    if (!error) {
      return normalizeTaskRows(data as unknown as PartialTaskRow[] | null);
    }

    if (isMissingSupabaseTable(error)) {
      return [];
    }

    let shouldRetry = false;

    if (includeCreatedBy && isMissingSupabaseColumn(error, "created_by")) {
      includeCreatedBy = false;
      shouldRetry = true;
    }

    if (includeArchivedAt && isMissingSupabaseColumn(error, "archived_at")) {
      if (archived) {
        return [];
      }

      includeArchivedAt = false;
      shouldRetry = true;
    }

    if (shouldRetry) {
      continue;
    }

    throw new Error(`Failed to load tasks: ${error.message}`);
  }

  return [];
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

function buildUsername(email: string) {
  const localPart = email.split("@")[0]?.trim().toLowerCase() ?? "";
  return localPart.replace(/[^a-z0-9._-]+/g, "") || "ttcs-user";
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "Never signed in";
  }

  const now = Date.now();
  const target = new Date(value).getTime();
  const diffMs = target - now;
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const diffMonths = Math.round(diffMs / (30 * 24 * 60 * 60 * 1000));
  const diffYears = Math.round(diffMs / (365 * 24 * 60 * 60 * 1000));
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, "day");
  }

  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, "month");
  }

  return formatter.format(diffYears, "year");
}

function deriveActivityStatus(lastLogin: string | null | undefined, isDeactivated: boolean): {
  label: "Active" | "Inactive" | "Pending" | "Deactivated";
  tone: "active" | "inactive" | "pending" | "deactivated";
} {
  if (isDeactivated) {
    return {
      label: "Deactivated",
      tone: "deactivated",
    };
  }

  if (!lastLogin) {
    return {
      label: "Pending",
      tone: "pending",
    };
  }

  const diffDays = Math.abs(Date.now() - new Date(lastLogin).getTime()) / (24 * 60 * 60 * 1000);

  if (diffDays <= 14) {
    return {
      label: "Active",
      tone: "active",
    };
  }

  return {
    label: "Inactive",
    tone: "inactive",
  };
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

  const profile = (data as ProfileRecord | null) ?? fallbackProfile(user);
  const authEmail = normalizeEmailAddress(user.email || "");
  const profileEmail = normalizeEmailAddress(profile.email || "");

  if (!authEmail || authEmail === profileEmail) {
    return profile;
  }

  await supabase.from("profiles").update({ email: authEmail }).eq("id", user.id);

  return {
    ...profile,
    email: authEmail,
  };
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
  await syncAutomaticTaskReminders();
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
  const cleanedMessage = sanitizeNotificationMessage(row.message);

  return {
    id: row.id,
    title: row.title,
    message: cleanedMessage,
    isRead: row.is_read,
    createdAt: row.created_at,
    subject: row.title,
    preview: cleanedMessage,
    sender: row.title.toLowerCase().includes("system") ? "System" : "TTCS",
    timeLabel: formatWithTz(row.created_at, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function sanitizeNotificationMessage(message: string) {
  return message
    .replace(/^\s*Meeting room:\s*.*$/gim, "")
    .replace(/^\s*Join link:\s*.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildInboxThreadPreview(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "No message content.";
  }

  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

function inferTaskCreatorFromMessage(message: string) {
  const match = message.match(/^(.+?) assigned you (?:to )?a task[:\s]/i);
  return match?.[1]?.trim() || null;
}

function inferInboxThreadType(subject: string, message: string) {
  const combined = `${subject} ${message}`.toLowerCase();
  if (combined.includes("meeting")) {
    return "meeting";
  }

  if (combined.includes("task")) {
    return "task_notification";
  }

  return "conversation";
}

function getTrashExpiration(trashedAt: string | null) {
  if (!trashedAt) {
    return null;
  }

  const trashedDate = new Date(trashedAt);
  if (Number.isNaN(trashedDate.getTime())) {
    return null;
  }

  return new Date(trashedDate.getTime() + INBOX_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function buildInboxFallbackThread(item: NotificationItem): InboxThreadItem {
  const senderLabel = inferTaskCreatorFromMessage(item.message) || item.sender || "TTCS";
  const threadType = inferInboxThreadType(item.subject, item.message);

  return {
    id: `notification:${item.id}`,
    subject: item.subject,
    preview: item.preview,
    updatedAt: item.createdAt,
    timeLabel: item.timeLabel,
    unreadCount: item.isRead ? 0 : 1,
    counterpartLabel: senderLabel,
    counterpartMeta:
      threadType === "task_notification"
        ? "Task notification"
        : threadType === "meeting"
          ? "Meeting notification"
          : "System notification",
    canReply: false,
    taskId: null,
    creatorLabel: senderLabel,
    threadType,
    isTrashed: false,
    trashExpiresAt: null,
    trashExpiresLabel: null,
    messages: [
      {
        id: item.id,
        subject: item.subject,
        body: item.message,
        createdAt: item.createdAt,
        timeLabel: item.timeLabel,
        isRead: item.isRead,
        isOutgoing: false,
        senderLabel,
        senderInitials: initialsFromName(senderLabel),
      },
    ],
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

function mapTaskCommentRow(row: TaskCommentRow, author?: ShellUser | null): TaskCommentItem {
  const authorLabel = author?.fullName ?? "Unknown user";

  return {
    id: row.id,
    taskId: row.task_id,
    body: row.body,
    createdAt: row.created_at,
    createdLabel: formatWithTz(row.created_at, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    authorId: row.author_user_id,
    authorLabel,
    authorInitials: author?.initials ?? initialsFromName(authorLabel),
    authorRoleLabel: author?.roleLabel ?? "User",
    isAdmin: author?.isAdmin ?? false,
  };
}

function mapTaskRow(
  row: TaskRow,
  assignees: ShellUser[] = [],
  attachments: TaskAttachment[] = [],
  comments: TaskCommentItem[] = [],
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
    archivedAt: row.archived_at,
    archivedLabel: row.archived_at
      ? formatWithTz(row.archived_at, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Not archived",
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
    comments,
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

async function getTaskCommentRowsByTaskId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskIds: number[],
) {
  if (!taskIds.length) {
    return new Map<number, TaskCommentRow[]>();
  }

  const { data, error } = await supabase
    .from("task_comments")
    .select("id,task_id,body,author_user_id,created_at")
    .in("task_id", taskIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return new Map<number, TaskCommentRow[]>();
    }
    throw new Error(`Failed to load task comments: ${error.message}`);
  }

  const commentsByTask = new Map<number, TaskCommentRow[]>();

  for (const row of (data as TaskCommentRow[] | null) ?? []) {
    const existing = commentsByTask.get(row.task_id) ?? [];
    existing.push(row);
    commentsByTask.set(row.task_id, existing);
  }

  return commentsByTask;
}

function mapTaskCommentsByTask(
  rowsByTask: Map<number, TaskCommentRow[]>,
  profileMap: Map<string, ShellUser>,
) {
  const commentsByTask = new Map<number, TaskCommentItem[]>();

  for (const [taskId, rows] of rowsByTask) {
    commentsByTask.set(
      taskId,
      rows.map((row) => mapTaskCommentRow(row, profileMap.get(row.author_user_id) ?? null)),
    );
  }

  return commentsByTask;
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

export async function getUserInboxThreads(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const admin = createAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  const cutoffIso = new Date(Date.now() - INBOX_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  const threadStateMap = new Map<string, InboxThreadStateRow>();

  const expiredCleanupResult = await admin
    .from("inbox_thread_states")
    .update({
      trashed_at: null,
      deleted_before: nowIso,
      updated_at: nowIso,
    })
    .eq("user_id", userId)
    .not("trashed_at", "is", null)
    .lte("trashed_at", cutoffIso);

  if (expiredCleanupResult.error && !isMissingSupabaseTable(expiredCleanupResult.error)) {
    throw new Error(`Failed to clean up inbox trash: ${expiredCleanupResult.error.message}`);
  }

  const threadStateResult = await admin
    .from("inbox_thread_states")
    .select("user_id,thread_key,trashed_at,deleted_before,updated_at")
    .eq("user_id", userId);

  if (threadStateResult.error && !isMissingSupabaseTable(threadStateResult.error)) {
    throw new Error(`Failed to load inbox thread states: ${threadStateResult.error.message}`);
  }

  for (const row of (threadStateResult.data as InboxThreadStateRow[] | null) ?? []) {
    threadStateMap.set(row.thread_key, row);
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,is_read,created_at,user_id,sender_user_id,thread_key,task_id")
    .or(`user_id.eq.${userId},sender_user_id.eq.${userId}`)
    .order("created_at", { ascending: true });

  if (error) {
    if (
      isMissingSupabaseColumn(error, "sender_user_id") ||
      isMissingSupabaseColumn(error, "thread_key") ||
      isMissingSupabaseColumn(error, "task_id")
    ) {
      const legacyItems = await getUserNotifications(supabase, userId);
      return legacyItems.map(buildInboxFallbackThread);
    }

    if (isMissingSupabaseTable(error)) {
      return [];
    }

    throw new Error(`Failed to load inbox threads: ${error.message}`);
  }

  const rows = (data as InboxNotificationRow[] | null) ?? [];
  if (!rows.length) {
    return [];
  }

  const visibleRows = rows.filter((row) => {
    const threadKey = row.thread_key || `notification:${row.id}`;
    const state = threadStateMap.get(threadKey);
    if (!state?.deleted_before) {
      return true;
    }

    return row.created_at > state.deleted_before;
  });

  if (!visibleRows.length) {
    return [];
  }

  const profileIds = unique(
    visibleRows.flatMap((row) => [row.user_id, row.sender_user_id].filter((value): value is string => Boolean(value))),
  );
  const profileMap = new Map<string, ShellUser>();

  if (profileIds.length) {
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id,email,full_name,is_admin,role,last_login,created_at")
      .in("id", profileIds);

    if (profileError && !isMissingSupabaseTable(profileError)) {
      throw new Error(`Failed to load inbox profiles: ${profileError.message}`);
    }

    for (const profile of (profiles as ProfileRecord[] | null) ?? []) {
      profileMap.set(profile.id, buildShellUser(profile));
    }
  }

  const grouped = new Map<string, InboxNotificationRow[]>();
  for (const row of visibleRows) {
    const threadKey = row.thread_key || `notification:${row.id}`;
    const existing = grouped.get(threadKey) ?? [];
    existing.push(row);
    grouped.set(threadKey, existing);
  }

  const threads: InboxThreadItem[] = [];

  for (const [threadKey, threadRows] of grouped) {
    const latestRow = threadRows[threadRows.length - 1];
    const participantIds = unique(
      threadRows.flatMap((row) => [row.user_id, row.sender_user_id].filter((value): value is string => Boolean(value))),
    );
    const otherParticipantId = participantIds.find((participantId) => participantId !== userId) ?? null;
    const counterpart = otherParticipantId ? profileMap.get(otherParticipantId) ?? null : null;
    const canReply = Boolean(otherParticipantId && latestRow.sender_user_id);
    const threadType = latestRow.task_id !== null ? "task_notification" : inferInboxThreadType(latestRow.title, latestRow.message);
    const inferredCreatorLabel = threadType === "task_notification" ? inferTaskCreatorFromMessage(latestRow.message) : null;
    const counterpartLabel =
      counterpart?.fullName ??
      inferredCreatorLabel ??
      (latestRow.sender_user_id ? "TTCS Member" : "System");
    const counterpartMeta = counterpart
      ? counterpart.roleLabel
      : threadType === "task_notification"
        ? "Task notification"
        : threadType === "meeting"
          ? "Meeting notification"
        : latestRow.sender_user_id
          ? "Conversation"
          : "System notification";
    const creatorProfile = latestRow.sender_user_id ? profileMap.get(latestRow.sender_user_id) ?? null : null;
    const creatorLabel = creatorProfile?.fullName ?? inferredCreatorLabel ?? counterpartLabel;
    const threadState = threadStateMap.get(threadKey);
    const trashExpiration = getTrashExpiration(threadState?.trashed_at ?? null);
    const latestMessage = sanitizeNotificationMessage(latestRow.message);

    threads.push({
      id: threadKey,
      subject: latestRow.title,
      preview: buildInboxThreadPreview(latestMessage),
      updatedAt: latestRow.created_at,
      timeLabel: formatWithTz(latestRow.created_at, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      unreadCount: threadRows.filter((row) => row.user_id === userId && !row.is_read).length,
      counterpartLabel,
      counterpartMeta,
      canReply,
      taskId: latestRow.task_id ?? null,
      creatorLabel,
      threadType,
      isTrashed: Boolean(threadState?.trashed_at),
      trashExpiresAt: trashExpiration?.toISOString() ?? null,
      trashExpiresLabel:
        trashExpiration
          ? formatWithTz(trashExpiration.toISOString(), {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : null,
      messages: threadRows.map((row) => {
        const sender =
          row.sender_user_id && row.sender_user_id !== userId
            ? profileMap.get(row.sender_user_id) ?? null
            : row.sender_user_id === userId
              ? profileMap.get(userId) ?? null
              : null;
        const cleanedMessage = sanitizeNotificationMessage(row.message);
        const fallbackSenderLabel =
          threadType === "task_notification" ? inferTaskCreatorFromMessage(row.message) ?? "TTCS" : "TTCS";
        const senderLabel = row.sender_user_id ? sender?.fullName ?? "TTCS Member" : fallbackSenderLabel;

        return {
          id: row.id,
          subject: row.title,
          body: cleanedMessage,
          createdAt: row.created_at,
          timeLabel: formatWithTz(row.created_at, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          isRead: row.is_read,
          isOutgoing: row.sender_user_id === userId,
          senderLabel,
          senderInitials: initialsFromName(senderLabel),
        };
      }),
    });
  }

  return threads.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
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

export async function getMonitoringNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit?: number,
): Promise<MonitoringNotificationItem[]> {
  let query = supabase
    .from("notifications")
    .select("id,title,message,is_read,created_at,user_id,sender_user_id,thread_key,task_id")
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return [];
    }
    throw new Error(`Failed to load monitoring notifications: ${error.message}`);
  }

  const rows = ((data as InboxNotificationRow[] | null) ?? []).filter((row) => {
    const threadKey = row.thread_key ?? "";
    const title = row.title ?? "";

    return (
      !threadKey.startsWith("task-reminder:") &&
      !title.startsWith("Task Overdue:") &&
      !title.startsWith("Task Deadline Reminder:")
    );
  });
  if (!rows.length) {
    return [];
  }

  const profileIds = unique(
    rows.flatMap((row) => [row.user_id, row.sender_user_id].filter((value): value is string => Boolean(value))),
  );
  const profileMap = new Map<string, ShellUser>();

  if (profileIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,is_admin,role,last_login,created_at")
      .in("id", profileIds);

    if (profileError && !isMissingSupabaseTable(profileError)) {
      throw new Error(`Failed to load notification profiles: ${profileError.message}`);
    }

    for (const profile of (profiles as ProfileRecord[] | null) ?? []) {
      profileMap.set(profile.id, buildShellUser(profile));
    }
  }

  return rows.map((row) => {
    const base = mapNotificationRow(row);
    const senderProfile = row.sender_user_id ? profileMap.get(row.sender_user_id) ?? null : null;
    const recipientProfile = profileMap.get(row.user_id) ?? null;
    const inferredTaskCreator = inferTaskCreatorFromMessage(row.message);
    const senderLabel =
      senderProfile?.fullName ??
      inferredTaskCreator ??
      (row.sender_user_id ? "TTCS Member" : base.sender);

    return {
      ...base,
      senderLabel,
      recipientLabel: recipientProfile?.fullName ?? "Unknown recipient",
      isReply: Boolean(row.task_id !== null && row.sender_user_id && !inferredTaskCreator),
      taskId: row.task_id,
      threadKey: row.thread_key,
    };
  });
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
      joinPath: "",
      videoRoomCode: "",
      dateTime: item.createdAt,
      endDateTime: null,
      dateLabel: formatWithTz(item.createdAt, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      timeLabel: formatWithTz(item.createdAt, {
        hour: "numeric",
        minute: "2-digit",
      }),
      endTimeLabel: "",
      createdAt: item.createdAt,
      createdById: null,
      createdByLabel: "TTCS",
      assignees: [],
    }));
}

export async function getUserTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  options?: {
    archived?: boolean;
  },
) {
  const admin = createAdminClient();
  await cleanupExpiredTasks(admin);
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

  const taskRows = await fetchTaskRows(supabase, {
    taskIds,
    archived: options?.archived ?? false,
  });
  const loadedTaskIds = taskRows.map((task) => task.id);
  const attachmentsByTask = await getTaskAttachmentsByTaskId(supabase, loadedTaskIds);
  const commentRowsByTask = await getTaskCommentRowsByTaskId(supabase, loadedTaskIds);
  const profileIds = unique(
    [
      userId,
      ...taskRows.map((task) => task.created_by).filter((value): value is string => Boolean(value)),
      ...taskRows.map((task) => task.last_edited_by).filter((value): value is string => Boolean(value)),
      ...Array.from(commentRowsByTask.values()).flatMap((rows) => rows.map((comment) => comment.author_user_id)),
    ],
  );
  const profileMap = new Map<string, ShellUser>();
  const commentsByTask = mapTaskCommentsByTask(commentRowsByTask, profileMap);

  if (profileIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,is_admin,role,last_login,created_at")
      .in("id", profileIds);

    if (profileError) {
      if (isMissingSupabaseTable(profileError)) {
        return taskRows.map((item) =>
          mapTaskRow(item, [], attachmentsByTask.get(item.id) ?? [], commentsByTask.get(item.id) ?? []),
        );
      }
      throw new Error(`Failed to load task profiles: ${profileError.message}`);
    }

    for (const profile of (profiles as ProfileRecord[] | null) ?? []) {
      profileMap.set(profile.id, buildShellUser(profile));
    }
  }

  const mappedCommentsByTask = mapTaskCommentsByTask(commentRowsByTask, profileMap);

  return taskRows.map((item) =>
    mapTaskRow(
      item,
      [],
      attachmentsByTask.get(item.id) ?? [],
      mappedCommentsByTask.get(item.id) ?? [],
      item.created_by ? profileMap.get(item.created_by) ?? null : null,
      item.last_edited_by ? profileMap.get(item.last_edited_by) ?? null : null,
    ),
  );
}

export async function getAdminTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options?: {
    archived?: boolean;
  },
) {
  const admin = createAdminClient();
  await cleanupExpiredTasks(admin);
  const tasks = await fetchTaskRows(supabase, {
    archived: options?.archived ?? false,
  });
  const taskIds = tasks.map((task) => task.id);
  const attachmentsByTask = await getTaskAttachmentsByTaskId(supabase, taskIds);
  const commentRowsByTask = await getTaskCommentRowsByTaskId(supabase, taskIds);

  let assignmentRows: AssignmentRow[] = [];
  if (taskIds.length) {
    const { data, error } = await supabase
      .from("task_assignments")
      .select("task_id,user_id")
      .in("task_id", taskIds);

    if (error) {
      if (isMissingSupabaseTable(error)) {
        const commentsByTask = mapTaskCommentsByTask(commentRowsByTask, new Map());
        return tasks.map((task) =>
          mapTaskRow(task, [], attachmentsByTask.get(task.id) ?? [], commentsByTask.get(task.id) ?? []),
        );
      }
      throw new Error(`Failed to load admin task assignments: ${error.message}`);
    }

    assignmentRows = (data as AssignmentRow[] | null) ?? [];
  }

  const userIds = unique([
    ...assignmentRows.map((item) => item.user_id),
    ...tasks.map((task) => task.created_by).filter((value): value is string => Boolean(value)),
    ...tasks.map((task) => task.last_edited_by).filter((value): value is string => Boolean(value)),
    ...Array.from(commentRowsByTask.values()).flatMap((rows) => rows.map((comment) => comment.author_user_id)),
  ]);
  let profiles: ProfileRecord[] = [];
  if (userIds.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,is_admin,role,last_login,created_at")
      .in("id", userIds);

    if (error) {
      if (isMissingSupabaseTable(error)) {
        const commentsByTask = mapTaskCommentsByTask(commentRowsByTask, new Map());
        return tasks.map((task) =>
          mapTaskRow(task, [], attachmentsByTask.get(task.id) ?? [], commentsByTask.get(task.id) ?? []),
        );
      }
      throw new Error(`Failed to load assignee profiles: ${error.message}`);
    }

    profiles = (data as ProfileRecord[] | null) ?? [];
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, buildShellUser(profile)]));
  const commentsByTask = mapTaskCommentsByTask(commentRowsByTask, profileMap);
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
      commentsByTask.get(task.id) ?? [],
      task.created_by ? profileMap.get(task.created_by) ?? null : null,
      task.last_edited_by ? profileMap.get(task.last_edited_by) ?? null : null,
    ),
  );
}

export async function getVisibleTasks(options?: { archived?: boolean }) {
  const admin = createAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  return getAdminTasks(admin, options);
}

export async function getAllProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminProfileListItem[]> {
  const admin = createAdminClient();
  const authUsersResult = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const bannedUntilMap = new Map(
    (authUsersResult.data?.users ?? []).map((user) => [user.id, user.banned_until ?? null]),
  );

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
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login,
    lastLoginLabel: profile.last_login
      ? formatWithTz(profile.last_login, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Never",
    lastActiveLabel: formatRelativeTime(profile.last_login),
    username: buildUsername(profile.email),
    ...(() => {
      const bannedUntil = bannedUntilMap.get(profile.id);
      const isDeactivated =
        typeof bannedUntil === "string" &&
        bannedUntil.length > 0 &&
        new Date(bannedUntil).getTime() > Date.now();
      const status = deriveActivityStatus(profile.last_login, isDeactivated);
      return {
        statusLabel: status.label,
        statusTone: status.tone,
      };
    })(),
    createdLabel: formatWithTz(profile.created_at, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    joinedLabel: formatWithTz(profile.created_at, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));
}

export async function getAllProfilesForMeetingManagement() {
  const admin = createAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  return getAllProfiles(admin);
}

export async function getInboxContacts(currentUserId: string) {
  const admin = createAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  const { data, error } = await admin
    .from("profiles")
    .select("id,email,full_name,is_admin,role,last_login,created_at")
    .neq("id", currentUserId)
    .order("is_admin", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return [];
    }
    throw new Error(`Failed to load inbox contacts: ${error.message}`);
  }

  return ((data as ProfileRecord[] | null) ?? []).map((profile) => buildShellUser(profile));
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
