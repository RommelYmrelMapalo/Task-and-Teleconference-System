import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import type { MeetingAttendanceItem, MeetingItem } from "@/lib/ttcs-data";
import { getAdminMeetings, getMeetingByIdForUser, getUserMeetings } from "@/lib/meeting-data";
import { isMissingSupabaseColumn, isMissingSupabaseTable } from "@/lib/supabase-errors";

const MANILA_TZ = "Asia/Manila";

type MeetingAttendanceRow = {
  meeting_id: number;
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
};

type AttendanceProfileRow = {
  is_admin: boolean;
};

export class MeetingAttendanceMutationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isAttendanceSchemaMismatch(error: { code?: string; message?: string } | null | undefined) {
  return (
    isMissingSupabaseTable(error) ||
    isMissingSupabaseColumn(error, "joined_at") ||
    isMissingSupabaseColumn(error, "left_at") ||
    isMissingSupabaseColumn(error, "created_at") ||
    isMissingSupabaseColumn(error, "updated_at")
  );
}

function formatWithTz(value: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    ...options,
  }).format(new Date(value));
}

function formatAttendanceLabel(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  return formatWithTz(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapAttendanceItem(meeting: MeetingItem, row: MeetingAttendanceRow | null): MeetingAttendanceItem {
  const closeAt = meeting.endDateTime ?? meeting.dateTime;
  const isPastMeeting = new Date(closeAt).getTime() < Date.now();
  let statusLabel: MeetingAttendanceItem["statusLabel"] = "Waiting to Join";

  if (row?.joined_at) {
    if (row.left_at) {
      statusLabel = isPastMeeting ? "Completed" : "Waiting to Join";
    } else {
      statusLabel = isPastMeeting ? "Closed" : "In Call";
    }
  } else if (isPastMeeting) {
    statusLabel = "Missed";
  }

  return {
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    meetingDateLabel: meeting.dateLabel,
    meetingTimeLabel: meeting.timeLabel,
    meetingStartsAt: meeting.dateTime,
    meetingEndsAt: meeting.endDateTime,
    roomLabel: meeting.room || "To be announced",
    joinPath: meeting.joinPath,
    joinedAt: row?.joined_at ?? null,
    leftAt: row?.left_at ?? null,
    joinedLabel: formatAttendanceLabel(row?.joined_at),
    leftLabel: formatAttendanceLabel(row?.left_at),
    statusLabel,
  };
}

async function loadAttendanceAccess(userId: string) {
  const admin = createAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profileResult.error) {
    throw new MeetingAttendanceMutationError(profileResult.error.message, 500);
  }

  const profile = (profileResult.data as AttendanceProfileRow | null) ?? null;
  if (!profile) {
    throw new MeetingAttendanceMutationError("Profile not found.", 404);
  }

  return {
    admin,
    isAdmin: profile.is_admin,
  };
}

export async function getMeetingAttendanceForUser({
  supabase,
  userId,
  limit = 50,
}: {
  supabase: Parameters<typeof getUserMeetings>[0];
  userId: string;
  limit?: number;
}) {
  const { isAdmin } = await loadAttendanceAccess(userId);
  const meetings = isAdmin ? await getAdminMeetings(supabase, limit) : await getUserMeetings(supabase, userId, limit);
  if (!meetings.length) {
    return [];
  }

  const sortedMeetings = [...meetings].sort(
    (left, right) => new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime(),
  );
  const admin = createAdminClient();
  const attendanceResult = await admin
    .from("meeting_attendance")
    .select("meeting_id,user_id,joined_at,left_at,created_at,updated_at")
    .eq("user_id", userId)
    .in(
      "meeting_id",
      sortedMeetings.map((meeting) => meeting.id),
    );

  if (attendanceResult.error) {
    if (isAttendanceSchemaMismatch(attendanceResult.error)) {
      return sortedMeetings.map((meeting) => mapAttendanceItem(meeting, null));
    }

    throw new Error(`Failed to load meeting attendance: ${attendanceResult.error.message}`);
  }

  const attendanceMap = new Map<number, MeetingAttendanceRow>();
  for (const row of (attendanceResult.data as MeetingAttendanceRow[] | null) ?? []) {
    attendanceMap.set(row.meeting_id, row);
  }

  return sortedMeetings.map((meeting) => mapAttendanceItem(meeting, attendanceMap.get(meeting.id) ?? null));
}

export async function recordMeetingAttendanceForUser({
  userId,
  meetingId,
  action,
}: {
  userId: string;
  meetingId: number;
  action: "join" | "leave";
}) {
  const { admin, isAdmin } = await loadAttendanceAccess(userId);
  const meeting = await getMeetingByIdForUser({
    meetingId,
    userId,
    isAdmin,
  });

  if (!meeting) {
    throw new MeetingAttendanceMutationError("You do not have access to this meeting.", 403);
  }

  const existingResult = await admin
    .from("meeting_attendance")
    .select("meeting_id,user_id,joined_at,left_at,created_at,updated_at")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingResult.error) {
    if (isAttendanceSchemaMismatch(existingResult.error)) {
      throw new MeetingAttendanceMutationError(
        "Meeting attendance storage is not installed yet. Run the latest Supabase setup script.",
        500,
      );
    }

    throw new MeetingAttendanceMutationError(existingResult.error.message, 500);
  }

  const existing = (existingResult.data as MeetingAttendanceRow | null) ?? null;
  const timestamp = new Date().toISOString();

  if (action === "join") {
    if (existing) {
      const updatePayload: {
        joined_at?: string;
        left_at?: string | null;
        updated_at?: string;
      } = {};

      if (!existing.joined_at) {
        updatePayload.joined_at = timestamp;
      }

      if (existing.left_at !== null) {
        updatePayload.left_at = null;
      }

      if (Object.keys(updatePayload).length) {
        updatePayload.updated_at = timestamp;
        const updateResult = await admin
          .from("meeting_attendance")
          .update(updatePayload)
          .eq("meeting_id", meetingId)
          .eq("user_id", userId);
        if (updateResult.error) {
          if (isAttendanceSchemaMismatch(updateResult.error)) {
            throw new MeetingAttendanceMutationError(
              "Meeting attendance storage is not installed yet. Run the latest Supabase setup script.",
              500,
            );
          }
          throw new MeetingAttendanceMutationError(updateResult.error.message, 500);
        }
      }

      return { meetingId, action };
    }

    const insertResult = await admin.from("meeting_attendance").insert({
      meeting_id: meetingId,
      user_id: userId,
      joined_at: timestamp,
      left_at: null,
      updated_at: timestamp,
    });

    if (insertResult.error) {
      if (isAttendanceSchemaMismatch(insertResult.error)) {
        throw new MeetingAttendanceMutationError(
          "Meeting attendance storage is not installed yet. Run the latest Supabase setup script.",
          500,
        );
      }
      throw new MeetingAttendanceMutationError(insertResult.error.message, 500);
    }

    return { meetingId, action };
  }

  if (existing) {
    const updateResult = await admin
      .from("meeting_attendance")
      .update({
        joined_at: existing.joined_at ?? timestamp,
        left_at: timestamp,
        updated_at: timestamp,
      })
      .eq("meeting_id", meetingId)
      .eq("user_id", userId);

    if (updateResult.error) {
      if (isAttendanceSchemaMismatch(updateResult.error)) {
        throw new MeetingAttendanceMutationError(
          "Meeting attendance storage is not installed yet. Run the latest Supabase setup script.",
          500,
        );
      }
      throw new MeetingAttendanceMutationError(updateResult.error.message, 500);
    }

    return { meetingId, action };
  }

  const insertResult = await admin.from("meeting_attendance").insert({
    meeting_id: meetingId,
    user_id: userId,
    joined_at: timestamp,
    left_at: timestamp,
    updated_at: timestamp,
  });

  if (insertResult.error) {
    if (isAttendanceSchemaMismatch(insertResult.error)) {
      throw new MeetingAttendanceMutationError(
        "Meeting attendance storage is not installed yet. Run the latest Supabase setup script.",
        500,
      );
    }
    throw new MeetingAttendanceMutationError(insertResult.error.message, 500);
  }

  return { meetingId, action };
}
