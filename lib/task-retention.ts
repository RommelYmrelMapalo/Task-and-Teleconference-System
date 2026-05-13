import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { isMissingSupabaseColumn, isMissingSupabaseTable } from "@/lib/supabase-errors";

const TASK_RETENTION_DAYS = 31;

type ExpiredTaskRow = {
  id: number;
};

export async function cleanupExpiredTasks(admin: ReturnType<typeof createAdminClient>) {
  const cutoffIso = new Date(Date.now() - TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const expiredTasksResult = await admin
    .from("tasks")
    .select("id")
    .is("archived_at", null)
    .lte("last_edited_at", cutoffIso);

  if (expiredTasksResult.error) {
    if (
      isMissingSupabaseTable(expiredTasksResult.error) ||
      isMissingSupabaseColumn(expiredTasksResult.error, "last_edited_at") ||
      isMissingSupabaseColumn(expiredTasksResult.error, "archived_at")
    ) {
      return 0;
    }

    throw new Error(`Failed to load tasks for archival: ${expiredTasksResult.error.message}`);
  }

  const expiredTaskRows = (expiredTasksResult.data as ExpiredTaskRow[] | null) ?? [];
  const taskIds = expiredTaskRows.map((row) => row.id);

  if (!taskIds.length) {
    return 0;
  }

  const archiveResult = await admin
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .in("id", taskIds);

  if (archiveResult.error) {
    throw new Error(`Failed to archive expired tasks: ${archiveResult.error.message}`);
  }

  return taskIds.length;
}

export { TASK_RETENTION_DAYS };
