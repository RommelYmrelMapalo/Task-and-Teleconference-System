import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { InboxMutationError, replyToInboxThread } from "@/lib/inbox-service";

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
    const payload = (await request.json()) as { threadKey?: string; message?: string };
    const threadKey = payload.threadKey?.trim() ?? "";
    const message = payload.message?.trim() ?? "";

    if (!threadKey) {
      return NextResponse.json({ error: "Thread key is required." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
    }

    const result = await replyToInboxThread(user.id, threadKey, message);
    return NextResponse.json({ message: result });
  } catch (inboxError) {
    if (inboxError instanceof InboxMutationError) {
      return NextResponse.json({ error: inboxError.message }, { status: inboxError.status });
    }

    const message = inboxError instanceof Error ? inboxError.message : "Could not send the reply.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
