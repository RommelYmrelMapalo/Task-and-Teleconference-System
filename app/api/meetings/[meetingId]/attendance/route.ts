import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { buildMeetingJoinPath } from "@/lib/meeting-links";
import { MeetingAttendanceMutationError, recordMeetingAttendanceForUser } from "@/lib/meeting-attendance";

function parseMeetingId(value: string) {
  const meetingId = Number(value);
  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    throw new MeetingAttendanceMutationError("Invalid meeting id.");
  }

  return meetingId;
}

async function readAttendanceAction(request: Request) {
  const clone = request.clone();

  try {
    const payload = (await request.json()) as { action?: unknown };
    const action = typeof payload.action === "string" ? payload.action.trim().toLowerCase() : "";
    if (action === "join" || action === "leave") {
      return action;
    }
  } catch {
    // Fall back to plain text parsing for keepalive and beacon requests.
  }

  try {
    const rawText = (await clone.text()).trim();
    if (!rawText) {
      throw new Error("Missing request body.");
    }

    const payload = JSON.parse(rawText) as { action?: unknown };
    const action = typeof payload.action === "string" ? payload.action.trim().toLowerCase() : "";
    if (action === "join" || action === "leave") {
      return action;
    }
  } catch {
    // Surface a single validation error below.
  }

  throw new MeetingAttendanceMutationError('Attendance action must be "join" or "leave".');
}

export async function POST(request: Request, context: { params: Promise<{ meetingId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { meetingId: rawMeetingId } = await context.params;
    const meetingId = parseMeetingId(rawMeetingId);
    const action = await readAttendanceAction(request);
    await recordMeetingAttendanceForUser({
      userId: user.id,
      meetingId,
      action,
    });

    revalidatePath("/admin/record-timein");
    revalidatePath("/admin/record-timeout");
    revalidatePath("/record-timein");
    revalidatePath("/record-timeout");
    revalidatePath("/assigned-meetings");
    revalidatePath(buildMeetingJoinPath(meetingId));

    return NextResponse.json({ ok: true });
  } catch (attendanceError) {
    if (attendanceError instanceof MeetingAttendanceMutationError) {
      return NextResponse.json({ error: attendanceError.message }, { status: attendanceError.status });
    }

    const message = attendanceError instanceof Error ? attendanceError.message : "Could not update meeting attendance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
