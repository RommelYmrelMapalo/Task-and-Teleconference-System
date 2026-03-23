import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { isMissingSupabaseColumn, isMissingSupabaseTable } from "@/lib/supabase-errors";

const TASK_RETENTION_DAYS = 31;

type ExpiredTaskRow = {
  id: number;
};

type ExpiredTaskAttachmentRow = {
  id: number;
  task_id: number;
  storage_path: string;
};

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

async function removeExpiredTaskStorage(
  admin: ReturnType<typeof createAdminClient>,
  attachmentRows: ExpiredTaskAttachmentRow[],
) {
  if (!attachmentRows.length) {
    return;
  }

  const pathsByBucket = new Map<string, string[]>();

  for (const row of attachmentRows) {
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
      console.error("Failed to remove expired task attachment files from storage.", {
        bucket,
        message: storageResult.error.message,
        paths,
      });
    }
  }
}

export async function cleanupExpiredTasks(admin: ReturnType<typeof createAdminClient>) {
  const cutoffIso = new Date(Date.now() - TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const expiredTasksResult = await admin
    .from("tasks")
    .select("id")
    .lte("last_edited_at", cutoffIso);

  if (expiredTasksResult.error) {
    if (
      isMissingSupabaseTable(expiredTasksResult.error) ||
      isMissingSupabaseColumn(expiredTasksResult.error, "last_edited_at")
    ) {
      return 0;
    }

    throw new Error(`Failed to load expired tasks: ${expiredTasksResult.error.message}`);
  }

  const expiredTaskRows = (expiredTasksResult.data as ExpiredTaskRow[] | null) ?? [];
  const taskIds = expiredTaskRows.map((row) => row.id);

  if (!taskIds.length) {
    return 0;
  }

  const attachmentResult = await admin
    .from("task_attachments")
    .select("id,task_id,storage_path")
    .in("task_id", taskIds);

  if (attachmentResult.error && !isMissingSupabaseTable(attachmentResult.error)) {
    throw new Error(`Failed to load expired task attachments: ${attachmentResult.error.message}`);
  }

  const attachmentRows = (attachmentResult.data as ExpiredTaskAttachmentRow[] | null) ?? [];
  const deleteResult = await admin.from("tasks").delete().in("id", taskIds);

  if (deleteResult.error) {
    throw new Error(`Failed to delete expired tasks: ${deleteResult.error.message}`);
  }

  await removeExpiredTaskStorage(admin, attachmentRows);
  return taskIds.length;
}

export { TASK_RETENTION_DAYS };
