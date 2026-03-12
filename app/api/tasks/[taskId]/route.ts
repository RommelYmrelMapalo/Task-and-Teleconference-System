import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { TaskMutationError, updateTaskForUser } from "@/lib/task-write-service";

function parseTaskId(value: string) {
  const taskId = Number(value);
  if (!Number.isFinite(taskId)) {
    throw new TaskMutationError("Invalid task id.");
  }

  return taskId;
}

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId: rawTaskId } = await context.params;
    const taskId = parseTaskId(rawTaskId);
    const formData = await request.formData();
    const result = await updateTaskForUser(user.id, taskId, formData);
    return NextResponse.json(result);
  } catch (taskError) {
    if (taskError instanceof TaskMutationError) {
      return NextResponse.json({ error: taskError.message }, { status: taskError.status });
    }

    const message = taskError instanceof Error ? taskError.message : "Could not update task.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
