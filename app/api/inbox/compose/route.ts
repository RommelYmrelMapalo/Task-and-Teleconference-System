import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { composeInboxThread, InboxMutationError } from "@/lib/inbox-service";

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
    const payload = (await request.json()) as {
      recipientUserId?: string;
      subject?: string;
      message?: string;
    };

    const recipientUserId = payload.recipientUserId?.trim() ?? "";
    const subject = payload.subject?.trim() ?? "";
    const message = payload.message?.trim() ?? "";

    if (!recipientUserId) {
      return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
    }

    const result = await composeInboxThread({
      senderUserId: user.id,
      recipientUserId,
      subject,
      message,
    });

    return NextResponse.json({ thread: result });
  } catch (inboxError) {
    if (inboxError instanceof InboxMutationError) {
      return NextResponse.json({ error: inboxError.message }, { status: inboxError.status });
    }

    const message = inboxError instanceof Error ? inboxError.message : "Could not compose the message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
