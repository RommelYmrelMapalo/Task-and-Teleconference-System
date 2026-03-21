import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { InboxMutationError, restoreInboxThreadForUser, trashInboxThreadForUser } from "@/lib/inbox-service";

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
    const payload = (await request.json()) as { threadKey?: string; action?: "trash" | "restore" };
    const threadKey = payload.threadKey?.trim() ?? "";
    const action = payload.action ?? "trash";

    if (!threadKey) {
      return NextResponse.json({ error: "Thread key is required." }, { status: 400 });
    }

    if (action === "restore") {
      await restoreInboxThreadForUser(user.id, threadKey);
    } else {
      await trashInboxThreadForUser(user.id, threadKey);
    }

    return NextResponse.json({ ok: true });
  } catch (inboxError) {
    if (inboxError instanceof InboxMutationError) {
      return NextResponse.json({ error: inboxError.message }, { status: inboxError.status });
    }

    const message = inboxError instanceof Error ? inboxError.message : "Could not update the thread.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
