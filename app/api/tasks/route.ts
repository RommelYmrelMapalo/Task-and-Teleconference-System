import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { createTaskForUser, TaskMutationError } from "@/lib/task-write-service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const result = await createTaskForUser(user.id, formData);
    return NextResponse.json(result);
  } catch (taskError) {
    if (taskError instanceof TaskMutationError) {
      return NextResponse.json({ error: taskError.message }, { status: taskError.status });
    }

    const message = taskError instanceof Error ? taskError.message : "Could not create task.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
