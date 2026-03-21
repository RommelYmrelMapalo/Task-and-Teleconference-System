import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { InboxMutationError, markInboxThreadReadForUser } from "@/lib/inbox-service";

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
    const { threadKey } = (await request.json()) as { threadKey?: string };
    if (!threadKey?.trim()) {
      return NextResponse.json({ error: "Thread key is required." }, { status: 400 });
    }

    await markInboxThreadReadForUser(user.id, threadKey.trim());
    return NextResponse.json({ ok: true });
  } catch (inboxError) {
    if (inboxError instanceof InboxMutationError) {
      return NextResponse.json({ error: inboxError.message }, { status: inboxError.status });
    }

    const message = inboxError instanceof Error ? inboxError.message : "Could not update the conversation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
