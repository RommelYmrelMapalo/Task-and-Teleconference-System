import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { createClient } from "@/app/utils/utils/supabase/server";
import { TaskMutationError, updateTaskForUser } from "@/lib/task-write-service";

function parseTaskId(value: string) {
  const taskId = Number(value);
  if (!Number.isFinite(taskId)) {
    throw new TaskMutationError("Invalid task id.");
  }

  return taskId;
}

function parseAttachmentId(value: string | null) {
  const attachmentId = Number(value);
  if (!Number.isFinite(attachmentId)) {
    throw new TaskMutationError("Invalid attachment id.");
  }

  return attachmentId;
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

function buildContentDisposition(filename: string) {
  const escaped = filename.replace(/"/g, '\\"');
  return `attachment; filename="${escaped}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
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
    const url = new URL(request.url);
    const attachmentId = parseAttachmentId(url.searchParams.get("attachmentId"));
    const attachmentResult = await supabase
      .from("task_attachments")
      .select("id,task_id,filename,mimetype,storage_path")
      .eq("id", attachmentId)
      .eq("task_id", taskId)
      .maybeSingle();

    if (attachmentResult.error) {
      return NextResponse.json({ error: attachmentResult.error.message }, { status: 500 });
    }

    if (!attachmentResult.data) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }

    const location = parseStorageLocation(attachmentResult.data.storage_path);
    if (!location) {
      return NextResponse.json({ error: "Invalid attachment path." }, { status: 400 });
    }

    const admin = createAdminClient();
    const downloadResult = await admin.storage.from(location.bucket).download(location.path);
    if (downloadResult.error || !downloadResult.data) {
      return NextResponse.json(
        { error: downloadResult.error?.message || "Could not download attachment." },
        { status: 500 },
      );
    }

    const arrayBuffer = await downloadResult.data.arrayBuffer();
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": attachmentResult.data.mimetype || "application/octet-stream",
        "Content-Disposition": buildContentDisposition(attachmentResult.data.filename),
        "Content-Length": String(arrayBuffer.byteLength),
      },
    });
  } catch (taskError) {
    if (taskError instanceof TaskMutationError) {
      return NextResponse.json({ error: taskError.message }, { status: taskError.status });
    }

    const message = taskError instanceof Error ? taskError.message : "Could not download attachment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
