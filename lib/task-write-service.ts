import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import type { TaskPriority, TaskStatus } from "@/lib/ttcs-data";
import { isMissingSupabaseColumn, isMissingSupabaseTable } from "@/lib/supabase-errors";

const ATTACHMENTS_BUCKET = "task-attachments";
const MANILA_OFFSET_HOURS = 8;
const ATTACHMENT_FILE_LIMIT_BYTES = 50 * 1024 * 1024;

type AttachmentRow = {
  id: number;
  storage_path: string;
};

const VALID_STATUS = new Set<TaskStatus>(["assigned", "in_progress", "for_revision", "completed"]);
const VALID_PRIORITY = new Set<TaskPriority>(["low", "normal", "high"]);

export class TaskMutationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim() ?? "";
  if (!localPart) {
    return "TTCS User";
  }

  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function resolveProfileName(fullName: unknown, email: string | null | undefined) {
  const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
  const trimmedEmail = email?.trim() ?? "";

  if (trimmedName && !trimmedName.includes("@")) {
    return trimmedName;
  }

  if (trimmedName && trimmedEmail && trimmedName.toLowerCase() !== trimmedEmail.toLowerCase()) {
    return trimmedName;
  }

  if (trimmedEmail) {
    return deriveNameFromEmail(trimmedEmail);
  }

  return "TTCS User";
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function combineDueDate(date: string, time: string) {
  if (!date) {
    return null;
  }

  const [yearText, monthText, dayText] = date.split("-");
  const [hourText, minuteText] = (time || "09:00").split(":");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new TaskMutationError("Invalid due date or time.");
  }

  return new Date(Date.UTC(year, month - 1, day, hour - MANILA_OFFSET_HOURS, minute)).toISOString();
}

function parseTaskValues(formData: FormData) {
  const title = readText(formData, "title");
  const description = readText(formData, "description");
  const status = readText(formData, "status") as TaskStatus;
  const priority = readText(formData, "priority") as TaskPriority;
  const deadline = combineDueDate(readText(formData, "dueDate"), readText(formData, "dueTime"));

  if (!title) {
    throw new TaskMutationError("Task title is required.");
  }

  if (!VALID_STATUS.has(status)) {
    throw new TaskMutationError("Invalid task status.");
  }

  if (!VALID_PRIORITY.has(priority)) {
    throw new TaskMutationError("Invalid task priority.");
  }

  return { title, description, status, priority, deadline };
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

function sanitizeFileName(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function ensureAttachmentBucket() {
  const admin = createAdminClient();
  const bucketResult = await admin.storage.getBucket(ATTACHMENTS_BUCKET);

  if (!bucketResult.error) {
    const updateResult = await admin.storage.updateBucket(ATTACHMENTS_BUCKET, {
      public: false,
      fileSizeLimit: ATTACHMENT_FILE_LIMIT_BYTES,
    });

    if (updateResult.error) {
      throw new TaskMutationError(updateResult.error.message, 500);
    }

    return admin;
  }

  const createResult = await admin.storage.createBucket(ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: ATTACHMENT_FILE_LIMIT_BYTES,
  });

  if (createResult.error && !/already exists/i.test(createResult.error.message)) {
    throw new TaskMutationError(createResult.error.message, 500);
  }

  return admin;
}

async function loadWriterContext(userId: string) {
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    if (isMissingSupabaseTable(profileError)) {
      return {
        admin,
        isAdmin: false,
      };
    }
    throw new TaskMutationError(profileError.message, 500);
  }

  if (!profile) {
    const authResult = await admin.auth.admin.getUserById(userId);
    if (authResult.error || !authResult.data.user) {
      throw new TaskMutationError(authResult.error?.message || "Could not load auth user.", 500);
    }

    const authUser = authResult.data.user;
    const fullName = resolveProfileName(authUser.user_metadata?.full_name, authUser.email);

    const insertResult = await admin.from("profiles").insert({
      id: userId,
      email: authUser.email || `${userId}@local.invalid`,
      full_name: fullName,
      is_admin: false,
      role: "user",
    });

    if (insertResult.error) {
      throw new TaskMutationError(insertResult.error.message, 500);
    }

    return {
      admin,
      isAdmin: false,
    };
  }

  return {
    admin,
    isAdmin: Boolean(profile?.is_admin),
  };
}

async function getTaskAccessContext(userId: string, taskId: number) {
  const { admin, isAdmin } = await loadWriterContext(userId);

  const { data: task, error: taskError } = await admin
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    throw new TaskMutationError(taskError.message, 500);
  }

  if (!task) {
    throw new TaskMutationError("Task not found.", 404);
  }

  if (isAdmin) {
    return {
      admin,
      isAdmin,
      isAssigned: true,
    };
  }

  const { data: assignment, error } = await admin
    .from("task_assignments")
    .select("task_id")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new TaskMutationError(error.message, 500);
  }

  return {
    admin,
    isAdmin,
    isAssigned: Boolean(assignment),
  };
}

async function writeTaskAuditLog(
  admin: ReturnType<typeof createAdminClient>,
  {
    actorUserId,
    taskId,
    action,
    details,
  }: {
    actorUserId: string;
    taskId: number;
    action: string;
    details: string;
  },
) {
  const insertResult = await admin.from("task_audit_logs").insert({
    actor_user_id: actorUserId,
    task_id: taskId,
    action,
    details,
  });

  if (insertResult.error && !isMissingSupabaseTable(insertResult.error)) {
    throw new TaskMutationError(insertResult.error.message, 500);
  }
}

function getFiles(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function uploadAttachmentFiles(taskId: number, files: File[]) {
  if (!files.length) {
    return;
  }

  const admin = await ensureAttachmentBucket();
  const attachmentRows: Array<{ task_id: number; filename: string; mimetype: string | null; storage_path: string }> = [];

  for (const file of files) {
    const objectPath = `${taskId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await admin.storage.from(ATTACHMENTS_BUCKET).upload(objectPath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadResult.error) {
      throw new TaskMutationError(uploadResult.error.message, 500);
    }

    attachmentRows.push({
      task_id: taskId,
      filename: file.name,
      mimetype: file.type || null,
      storage_path: `${ATTACHMENTS_BUCKET}/${objectPath}`,
    });
  }

  const insertResult = await admin.from("task_attachments").insert(attachmentRows);
  if (insertResult.error) {
    throw new TaskMutationError(insertResult.error.message, 500);
  }
}

async function deleteAttachmentRows(admin: ReturnType<typeof createAdminClient>, rows: AttachmentRow[]) {
  if (!rows.length) {
    return;
  }

  const ids = rows.map((row) => row.id);
  const deleteResult = await admin.from("task_attachments").delete().in("id", ids);
  if (deleteResult.error) {
    throw new TaskMutationError(deleteResult.error.message, 500);
  }

  const pathsByBucket = new Map<string, string[]>();
  for (const row of rows) {
    const location = parseStorageLocation(row.storage_path);
    if (!location) {
      continue;
    }

    const existing = pathsByBucket.get(location.bucket) ?? [];
    existing.push(location.path);
    pathsByBucket.set(location.bucket, existing);
  }

  for (const [bucket, paths] of pathsByBucket) {
    const storageResult = await admin.storage.from(bucket).remove(paths);
    if (storageResult.error) {
      throw new TaskMutationError(storageResult.error.message, 500);
    }
  }
}

export async function createTaskForUser(userId: string, formData: FormData) {
  const { admin } = await loadWriterContext(userId);
  const values = parseTaskValues(formData);
  const now = new Date().toISOString();

  let insertResult = await admin
    .from("tasks")
    .insert({
      title: values.title,
      description: values.description || null,
      status: values.status,
      priority: values.priority,
      deadline: values.deadline,
      created_by: userId,
      last_edited_by: userId,
      last_edited_at: now,
    })
    .select("id")
    .single();

  if (insertResult.error && isMissingSupabaseColumn(insertResult.error, "created_by")) {
    insertResult = await admin
      .from("tasks")
      .insert({
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        deadline: values.deadline,
        last_edited_by: userId,
        last_edited_at: now,
      })
      .select("id")
      .single();
  }

  if (insertResult.error || !insertResult.data) {
    throw new TaskMutationError(insertResult.error?.message || "Could not create task.", 500);
  }

  const taskId = insertResult.data.id;
  const assignmentResult = await admin.from("task_assignments").insert({
    task_id: taskId,
    user_id: userId,
  });

  if (assignmentResult.error) {
    throw new TaskMutationError(assignmentResult.error.message, 500);
  }

  await uploadAttachmentFiles(taskId, getFiles(formData));

  return { taskId };
}

export async function updateTaskForUser(userId: string, taskId: number, formData: FormData) {
  const access = await getTaskAccessContext(userId, taskId);
  const admin = access.admin;
  const values = parseTaskValues(formData);
  const now = new Date().toISOString();

  const updateResult = await admin
    .from("tasks")
    .update({
      title: values.title,
      description: values.description || null,
      status: values.status,
      priority: values.priority,
      deadline: values.deadline,
      last_edited_by: userId,
      last_edited_at: now,
    })
    .eq("id", taskId);

  if (updateResult.error) {
    throw new TaskMutationError(updateResult.error.message, 500);
  }

  const existingResult = await admin
    .from("task_attachments")
    .select("id,storage_path")
    .eq("task_id", taskId);

  if (existingResult.error) {
    throw new TaskMutationError(existingResult.error.message, 500);
  }

  const keepAttachmentIds = new Set(
    formData
      .getAll("keepAttachmentIds")
      .map((value) => (typeof value === "string" ? value : ""))
      .filter(Boolean),
  );
  const existingRows = (existingResult.data as AttachmentRow[] | null) ?? [];
  const removedRows = existingRows.filter((row) => !keepAttachmentIds.has(String(row.id)));

  await deleteAttachmentRows(admin, removedRows);
  await uploadAttachmentFiles(taskId, getFiles(formData));

  if (!access.isAdmin && !access.isAssigned) {
    await writeTaskAuditLog(admin, {
      actorUserId: userId,
      taskId,
      action: "unassigned_task_edit",
      details: "Task updated by a user who was not assigned to it.",
    });
  }

  return { taskId };
}

export async function toggleTaskForUser(userId: string, taskId: number) {
  const access = await getTaskAccessContext(userId, taskId);
  const admin = access.admin;
  const taskResult = await admin
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();

  if (taskResult.error || !taskResult.data) {
    throw new TaskMutationError(taskResult.error?.message || "Could not load task.", 500);
  }

  const nextStatus: TaskStatus = taskResult.data.status === "completed" ? "in_progress" : "completed";
  const updateResult = await admin
    .from("tasks")
    .update({
      status: nextStatus,
      last_edited_by: userId,
      last_edited_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (updateResult.error) {
    throw new TaskMutationError(updateResult.error.message, 500);
  }

  if (!access.isAdmin && !access.isAssigned && nextStatus === "completed") {
    await writeTaskAuditLog(admin, {
      actorUserId: userId,
      taskId,
      action: "unassigned_task_completion",
      details: "Task marked as completed by a user who was not assigned to it.",
    });
  }

  if (!access.isAdmin && !access.isAssigned && nextStatus === "in_progress") {
    await writeTaskAuditLog(admin, {
      actorUserId: userId,
      taskId,
      action: "unassigned_task_restore",
      details: "Task marked as uncomplete by a user who was not assigned to it.",
    });
  }

  return { taskId, status: nextStatus };
}
