import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import type { TaskPriority, TaskStatus } from "@/lib/ttcs-data";
import { isMissingSupabaseColumn, isMissingSupabaseTable } from "@/lib/supabase-errors";

const MANILA_TIME_ZONE = "Asia/Manila";
export const INBOX_TRASH_RETENTION_DAYS = 31;

export class InboxMutationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function formatWithTz(value: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    ...options,
  }).format(new Date(value));
}

function formatPriority(priority: TaskPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatStatus(status: TaskStatus) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeUserPair(leftUserId: string, rightUserId: string) {
  return [leftUserId, rightUserId].sort();
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function deriveNameFromEmail(email: string) {
  return email
    .split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .trim() ?? "";
}

function inferTaskCreatorFromMessage(message: string) {
  const quotedAssignmentMatch = message.match(/^(.+?) assigned you to /i);
  if (quotedAssignmentMatch?.[1]?.trim()) {
    return quotedAssignmentMatch[1].trim();
  }

  const taskAssignmentMatch = message.match(/^(.+?) assigned you (?:to )?a task[:\s]/i);
  return taskAssignmentMatch?.[1]?.trim() || null;
}

async function resolveRecipientFromTaskMessage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  message: string,
) {
  const creatorLabel = inferTaskCreatorFromMessage(message);
  if (!creatorLabel) {
    return null;
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id,email,full_name")
    .neq("id", userId);

  if (error) {
    if (isMissingSupabaseTable(error)) {
      return null;
    }
    throw new InboxMutationError(error.message, 500);
  }

  const normalizedCreatorLabel = normalizeName(creatorLabel);
  const matchedProfile = ((data as Array<{ id: string; email: string; full_name: string | null }> | null) ?? []).find(
    (profile) => {
      const normalizedFullName = normalizeName(profile.full_name ?? "");
      const normalizedAlias = normalizeName(deriveNameFromEmail(profile.email));
      return normalizedFullName === normalizedCreatorLabel || normalizedAlias === normalizedCreatorLabel;
    },
  );

  return matchedProfile?.id ?? null;
}

export function buildTaskThreadKey(taskId: number, leftUserId: string, rightUserId: string) {
  const [firstUserId, secondUserId] = normalizeUserPair(leftUserId, rightUserId);
  return `task:${taskId}:users:${firstUserId}:${secondUserId}`;
}

export function buildDirectThreadKey(leftUserId: string, rightUserId: string) {
  const [firstUserId, secondUserId] = normalizeUserPair(leftUserId, rightUserId);
  return `direct:${Date.now()}:users:${firstUserId}:${secondUserId}`;
}

export function buildTaskAssignmentSubject(taskTitle: string) {
  return `Task Assignment: ${taskTitle}`;
}

export function buildTaskAssignmentMessage({
  actorName,
  taskTitle,
  description,
  deadline,
  priority,
  status,
}: {
  actorName: string;
  taskTitle: string;
  description: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
}) {
  const lines = [
    `${actorName} assigned you to "${taskTitle}".`,
    `Status: ${formatStatus(status)}`,
    `Priority: ${formatPriority(priority)}`,
    `Due: ${
      deadline
        ? formatWithTz(deadline, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "No deadline"
    }`,
  ];

  const trimmedDescription = description?.trim() ?? "";
  if (trimmedDescription) {
    lines.push("", "Task details:", trimmedDescription);
  }

  lines.push("", "Reply in this thread if you need clarification or want to send an update.");

  return lines.join("\n");
}

function getMissingInboxSchemaMessage() {
  return "Inbox threads are not configured yet. Run ttcs/supabase/inbox-thread-upgrade.sql in Supabase first.";
}

function getMissingInboxTrashSchemaMessage() {
  return "Inbox trash is not configured yet. Run ttcs/supabase/inbox-trash-upgrade.sql in Supabase first.";
}

async function cleanupExpiredInboxTrashForUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const cutoffIso = new Date(Date.now() - INBOX_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  const updateResult = await admin
    .from("inbox_thread_states")
    .update({
      trashed_at: null,
      deleted_before: nowIso,
      updated_at: nowIso,
    })
    .eq("user_id", userId)
    .not("trashed_at", "is", null)
    .lte("trashed_at", cutoffIso);

  if (updateResult.error) {
    if (isMissingSupabaseTable(updateResult.error)) {
      return;
    }
    throw new InboxMutationError(updateResult.error.message, 500);
  }
}

async function loadThreadRows(threadKey: string) {
  const admin = createAdminClient();
  const result = await admin
    .from("notifications")
    .select("id,title,message,is_read,created_at,user_id,sender_user_id,thread_key,task_id")
    .eq("thread_key", threadKey)
    .order("created_at", { ascending: true });

  if (result.error) {
    if (
      isMissingSupabaseColumn(result.error, "thread_key") ||
      isMissingSupabaseColumn(result.error, "sender_user_id") ||
      isMissingSupabaseColumn(result.error, "task_id")
    ) {
      throw new InboxMutationError(getMissingInboxSchemaMessage(), 500);
    }

    if (isMissingSupabaseTable(result.error)) {
      throw new InboxMutationError("Inbox is not configured yet.", 500);
    }

    throw new InboxMutationError(result.error.message, 500);
  }

  return {
    admin,
    rows:
      ((result.data as Array<{
        id: number;
        title: string;
        message: string;
        is_read: boolean;
        created_at: string;
        user_id: string;
        sender_user_id: string | null;
        thread_key: string | null;
        task_id: number | null;
      }> | null) ?? []),
  };
}

async function ensureUserParticipatesInThread(userId: string, threadKey: string) {
  const { admin, rows } = await loadThreadRows(threadKey);
  const participatesInThread =
    rows.some((row) => row.user_id === userId) || rows.some((row) => row.sender_user_id === userId);

  if (!participatesInThread) {
    throw new InboxMutationError("Conversation not found.", 404);
  }

  return { admin, rows };
}

export async function markInboxThreadReadForUser(userId: string, threadKey: string) {
  const { admin, rows } = await ensureUserParticipatesInThread(userId, threadKey);

  const ownedRows = rows.filter((row) => row.user_id === userId);

  const unreadIds = ownedRows.filter((row) => !row.is_read).map((row) => row.id);
  if (!unreadIds.length) {
    return;
  }

  const updateResult = await admin.from("notifications").update({ is_read: true }).in("id", unreadIds);
  if (updateResult.error) {
    throw new InboxMutationError(updateResult.error.message, 500);
  }
}

export async function replyToInboxThread(userId: string, threadKey: string, rawMessage: string) {
  const message = rawMessage.trim();
  if (!message) {
    throw new InboxMutationError("Reply message is required.");
  }

  const { admin, rows } = await ensureUserParticipatesInThread(userId, threadKey);
  if (!rows.length) {
    throw new InboxMutationError("Conversation not found.", 404);
  }

  await cleanupExpiredInboxTrashForUser(admin, userId);

  const latestRow = rows[rows.length - 1];

  const participantIds = Array.from(
    new Set(rows.flatMap((row) => [row.user_id, row.sender_user_id].filter((value): value is string => Boolean(value)))),
  );

  if (!participantIds.includes(userId)) {
    throw new InboxMutationError("Conversation not found.", 404);
  }

  let recipientId = participantIds.find((participantId) => participantId !== userId) ?? null;

  if (!recipientId && latestRow.task_id !== null) {
    let taskResult = await admin
      .from("tasks")
      .select("created_by,last_edited_by")
      .eq("id", latestRow.task_id)
      .maybeSingle();

    if (taskResult.error && isMissingSupabaseColumn(taskResult.error, "created_by")) {
      taskResult = await admin
        .from("tasks")
        .select("last_edited_by")
        .eq("id", latestRow.task_id)
        .maybeSingle();
    }

    if (taskResult.error && !isMissingSupabaseTable(taskResult.error)) {
      throw new InboxMutationError(taskResult.error.message, 500);
    }

    const taskRow =
      (taskResult.data as { created_by?: string | null; last_edited_by?: string | null } | null) ?? null;
    const taskOwnerId = taskRow?.created_by ?? taskRow?.last_edited_by ?? null;
    if (taskOwnerId && taskOwnerId !== userId) {
      recipientId = taskOwnerId;
    }
  }

  if (!recipientId) {
    recipientId = await resolveRecipientFromTaskMessage(admin, userId, latestRow.message);
  }

  if (!recipientId) {
    throw new InboxMutationError("This conversation cannot accept replies.", 400);
  }

  const insertResult = await admin
    .from("notifications")
    .insert({
      title: latestRow.title,
      message,
      user_id: recipientId,
      sender_user_id: userId,
      thread_key: threadKey,
      task_id: latestRow.task_id,
    })
    .select("id,title,message,is_read,created_at")
    .single();

  if (insertResult.error) {
    if (
      isMissingSupabaseColumn(insertResult.error, "thread_key") ||
      isMissingSupabaseColumn(insertResult.error, "sender_user_id") ||
      isMissingSupabaseColumn(insertResult.error, "task_id")
    ) {
      throw new InboxMutationError(getMissingInboxSchemaMessage(), 500);
    }

    throw new InboxMutationError(insertResult.error.message, 500);
  }

  return insertResult.data as {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  };
}

export async function trashInboxThreadForUser(userId: string, threadKey: string) {
  const { admin } = await ensureUserParticipatesInThread(userId, threadKey);
  await cleanupExpiredInboxTrashForUser(admin, userId);

  const nowIso = new Date().toISOString();
  const upsertResult = await admin.from("inbox_thread_states").upsert(
    {
      user_id: userId,
      thread_key: threadKey,
      trashed_at: nowIso,
      updated_at: nowIso,
    },
    {
      onConflict: "user_id,thread_key",
    },
  );

  if (upsertResult.error) {
    if (isMissingSupabaseTable(upsertResult.error)) {
      throw new InboxMutationError(getMissingInboxTrashSchemaMessage(), 500);
    }
    throw new InboxMutationError(upsertResult.error.message, 500);
  }
}

export async function restoreInboxThreadForUser(userId: string, threadKey: string) {
  const { admin } = await ensureUserParticipatesInThread(userId, threadKey);
  await cleanupExpiredInboxTrashForUser(admin, userId);

  const nowIso = new Date().toISOString();
  const upsertResult = await admin.from("inbox_thread_states").upsert(
    {
      user_id: userId,
      thread_key: threadKey,
      trashed_at: null,
      updated_at: nowIso,
    },
    {
      onConflict: "user_id,thread_key",
    },
  );

  if (upsertResult.error) {
    if (isMissingSupabaseTable(upsertResult.error)) {
      throw new InboxMutationError(getMissingInboxTrashSchemaMessage(), 500);
    }
    throw new InboxMutationError(upsertResult.error.message, 500);
  }
}

export async function composeInboxThread({
  senderUserId,
  recipientUserId,
  subject,
  message,
}: {
  senderUserId: string;
  recipientUserId: string;
  subject: string;
  message: string;
}) {
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();

  if (!trimmedSubject) {
    throw new InboxMutationError("Message title is required.");
  }

  if (!trimmedMessage) {
    throw new InboxMutationError("Message body is required.");
  }

  if (senderUserId === recipientUserId) {
    throw new InboxMutationError("You cannot send a message to yourself.");
  }

  const admin = createAdminClient();
  const threadKey = buildDirectThreadKey(senderUserId, recipientUserId);
  const insertResult = await admin
    .from("notifications")
    .insert({
      title: trimmedSubject,
      message: trimmedMessage,
      user_id: recipientUserId,
      sender_user_id: senderUserId,
      thread_key: threadKey,
      task_id: null,
    })
    .select("id,title,message,is_read,created_at,thread_key")
    .single();

  if (insertResult.error) {
    if (
      isMissingSupabaseColumn(insertResult.error, "sender_user_id") ||
      isMissingSupabaseColumn(insertResult.error, "thread_key") ||
      isMissingSupabaseColumn(insertResult.error, "task_id")
    ) {
      throw new InboxMutationError(getMissingInboxSchemaMessage(), 500);
    }

    throw new InboxMutationError(insertResult.error.message, 500);
  }

  return insertResult.data as {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    thread_key: string;
  };
}
