import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { createClient } from "@/app/utils/utils/supabase/server";
import {
  getAllNotifications,
  getMeetingItems,
  getUserNotifications,
  type MeetingItem,
  type ProfileRecord,
  type ShellUser,
} from "@/lib/ttcs-data";
import { buildMeetingJoinPath, buildMeetingVideoRoomCode } from "@/lib/meeting-links";
import { isMissingSupabaseTable } from "@/lib/supabase-errors";

const MANILA_TZ = "Asia/Manila";

type MeetingRow = {
  id: number;
  title: string;
  description: string | null;
  room: string | null;
  scheduled_for: string;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type MeetingAssignmentRow = {
  meeting_id: number;
  user_id: string;
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function formatDisplayName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim() ?? "";
  if (!localPart) {
    return "TTCS User";
  }

  return formatDisplayName(localPart.replace(/[._-]+/g, " "));
}

function resolveProfileName(fullName: string | null | undefined, email: string) {
  const trimmedName = fullName?.trim() ?? "";
  const trimmedEmail = email.trim();

  if (trimmedName && !trimmedName.includes("@")) {
    return formatDisplayName(trimmedName);
  }

  if (trimmedName && trimmedEmail && trimmedName.toLowerCase() !== trimmedEmail.toLowerCase()) {
    return formatDisplayName(trimmedName);
  }

  if (trimmedEmail) {
    return deriveNameFromEmail(trimmedEmail);
  }

  return "TTCS User";
}

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "TT";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function buildShellUser(profile: ProfileRecord): ShellUser {
  const fullName = resolveProfileName(profile.full_name, profile.email);

  return {
    id: profile.id,
    email: profile.email,
    fullName,
    initials: initialsFromName(fullName),
    isAdmin: profile.is_admin,
    role: profile.role,
    roleLabel: profile.is_admin ? "Admin" : "User",
  };
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

function buildMeetingTimeLabel(startIso: string, endIso: string | null) {
  const startLabel = formatWithTz(startIso, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endIso) {
    return startLabel;
  }

  const endLabel = formatWithTz(endIso, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startLabel} - ${endLabel}`;
}

function mapMeetingRow(
  row: MeetingRow,
  assignees: ShellUser[],
  creator: ShellUser | null,
): MeetingItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description?.trim() || "No meeting notes yet.",
    room: row.room?.trim() || "",
    joinPath: buildMeetingJoinPath(row.id),
    videoRoomCode: buildMeetingVideoRoomCode({
      meetingId: row.id,
      title: row.title,
      createdAt: row.created_at,
    }),
    dateTime: row.scheduled_for,
    endDateTime: row.ends_at,
    dateLabel: formatWithTz(row.scheduled_for, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    timeLabel: buildMeetingTimeLabel(row.scheduled_for, row.ends_at),
    endTimeLabel: formatWithTz(row.ends_at, {
      hour: "numeric",
      minute: "2-digit",
    }),
    createdAt: row.created_at,
    createdById: row.created_by,
    createdByLabel: creator?.fullName ?? "TTCS Admin",
    assignees,
  };
}

async function loadProfiles(profileIds: string[]) {
  if (!profileIds.length) {
    return new Map<string, ShellUser>();
  }

  const admin = createAdminClient();
  const result = await admin
    .from("profiles")
    .select("id,email,full_name,is_admin,role,last_login,created_at")
    .in("id", profileIds);

  if (result.error) {
    if (isMissingSupabaseTable(result.error)) {
      return new Map<string, ShellUser>();
    }

    throw new Error(`Failed to load meeting profiles: ${result.error.message}`);
  }

  return new Map(
    (((result.data as ProfileRecord[] | null) ?? []).map((profile) => [profile.id, buildShellUser(profile)])),
  );
}

async function hydrateMeetings(meetingRows: MeetingRow[]) {
  if (!meetingRows.length) {
    return [];
  }

  const admin = createAdminClient();
  const meetingIds = meetingRows.map((row) => row.id);
  const assignmentResult = await admin
    .from("meeting_assignments")
    .select("meeting_id,user_id")
    .in("meeting_id", meetingIds);

  if (assignmentResult.error) {
    if (isMissingSupabaseTable(assignmentResult.error)) {
      return null;
    }

    throw new Error(`Failed to load meeting assignments: ${assignmentResult.error.message}`);
  }

  const assignmentRows = (assignmentResult.data as MeetingAssignmentRow[] | null) ?? [];
  const profileIds = unique([
    ...assignmentRows.map((assignment) => assignment.user_id),
    ...meetingRows.map((meeting) => meeting.created_by).filter((value): value is string => Boolean(value)),
  ]);
  const profileMap = await loadProfiles(profileIds);
  const assigneesByMeeting = new Map<number, ShellUser[]>();

  for (const assignment of assignmentRows) {
    const assignee = profileMap.get(assignment.user_id);
    if (!assignee) {
      continue;
    }

    const existing = assigneesByMeeting.get(assignment.meeting_id) ?? [];
    existing.push(assignee);
    assigneesByMeeting.set(assignment.meeting_id, existing);
  }

  return meetingRows.map((meeting) =>
    mapMeetingRow(
      meeting,
      assigneesByMeeting.get(meeting.id) ?? [],
      meeting.created_by ? profileMap.get(meeting.created_by) ?? null : null,
    ),
  );
}

export async function getUserMeetings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  limit?: number,
) {
  const admin = createAdminClient();
  const assignmentResult = await admin
    .from("meeting_assignments")
    .select("meeting_id")
    .eq("user_id", userId);

  if (assignmentResult.error) {
    if (isMissingSupabaseTable(assignmentResult.error)) {
      return getMeetingItems(await getUserNotifications(supabase, userId, limit));
    }

    throw new Error(`Failed to load assigned meetings: ${assignmentResult.error.message}`);
  }

  const meetingIds = unique(
    (((assignmentResult.data as Array<{ meeting_id: number }> | null) ?? []).map((item) => item.meeting_id)),
  );
  if (!meetingIds.length) {
    return [];
  }

  let query = admin
    .from("meetings")
    .select("id,title,description,room,scheduled_for,ends_at,created_by,created_at,updated_at")
    .in("id", meetingIds)
    .order("scheduled_for", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const meetingResult = await query;
  if (meetingResult.error) {
    if (isMissingSupabaseTable(meetingResult.error)) {
      return getMeetingItems(await getUserNotifications(supabase, userId, limit));
    }

    throw new Error(`Failed to load meeting records: ${meetingResult.error.message}`);
  }

  const hydrated = await hydrateMeetings((meetingResult.data as MeetingRow[] | null) ?? []);
  if (!hydrated) {
    return getMeetingItems(await getUserNotifications(supabase, userId, limit));
  }

  return hydrated;
}

export async function getAdminMeetings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit?: number,
) {
  const admin = createAdminClient();
  let query = admin
    .from("meetings")
    .select("id,title,description,room,scheduled_for,ends_at,created_by,created_at,updated_at")
    .order("scheduled_for", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const meetingResult = await query;
  if (meetingResult.error) {
    if (isMissingSupabaseTable(meetingResult.error)) {
      return getMeetingItems(await getAllNotifications(supabase, limit));
    }

    throw new Error(`Failed to load admin meetings: ${meetingResult.error.message}`);
  }

  const hydrated = await hydrateMeetings((meetingResult.data as MeetingRow[] | null) ?? []);
  if (!hydrated) {
    return getMeetingItems(await getAllNotifications(supabase, limit));
  }

  return hydrated;
}

export async function getMeetingByIdForUser({
  meetingId,
  userId,
  isAdmin,
}: {
  meetingId: number;
  userId: string;
  isAdmin: boolean;
}) {
  const admin = createAdminClient();

  const meetingResult = await admin
    .from("meetings")
    .select("id,title,description,room,scheduled_for,ends_at,created_by,created_at,updated_at")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingResult.error) {
    if (isMissingSupabaseTable(meetingResult.error)) {
      return null;
    }

    throw new Error(`Failed to load meeting record: ${meetingResult.error.message}`);
  }

  if (!meetingResult.data) {
    return null;
  }

  const meetingRow = meetingResult.data as MeetingRow;

  if (!isAdmin && meetingRow.created_by !== userId) {
    const assignmentResult = await admin
      .from("meeting_assignments")
      .select("meeting_id")
      .eq("meeting_id", meetingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (assignmentResult.error) {
      if (isMissingSupabaseTable(assignmentResult.error)) {
        return null;
      }

      throw new Error(`Failed to verify meeting access: ${assignmentResult.error.message}`);
    }

    if (!assignmentResult.data) {
      return null;
    }
  }

  const hydrated = await hydrateMeetings([meetingRow]);
  return hydrated?.[0] ?? null;
}
