import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { isMissingSupabaseColumn, isMissingSupabaseTable } from "@/lib/supabase-errors";
import type { AppRole } from "@/lib/ttcs-data";

const MANILA_OFFSET_HOURS = 8;
const VALID_MEETING_ROLES = new Set<AppRole>(["admin", "user"]);

type MeetingRecipient = {
  id: string;
  email: string;
  fullName: string;
};

type MeetingRecipientRow = {
  id: string;
  email: string;
  full_name: string;
};

type WriterProfile = {
  email: string;
  full_name: string;
};

export class MeetingMutationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim() ?? "";
  if (!localPart) {
    return "TTCS User";
  }

  return localPart
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function resolveProfileName(fullName: string | null | undefined, email: string) {
  const trimmedName = fullName?.trim() ?? "";
  const trimmedEmail = email.trim();

  if (trimmedName && !trimmedName.includes("@")) {
    return trimmedName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  return trimmedEmail ? deriveNameFromEmail(trimmedEmail) : "TTCS User";
}

function formatWithTz(value: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    ...options,
  }).format(new Date(value));
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseParticipantIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("participantIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function parseParticipantRoles(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("participantRoles")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value): value is AppRole => VALID_MEETING_ROLES.has(value as AppRole)),
    ),
  );
}

function combineManilaDate(date: string, time: string, label: string) {
  if (!date || !time) {
    throw new MeetingMutationError(`${label} date and time are required.`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new MeetingMutationError(`Invalid ${label.toLowerCase()} date or time.`);
  }

  const [yearText, monthText, dayText] = date.split("-");
  const [hourText, minuteText] = time.split(":");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new MeetingMutationError(`Invalid ${label.toLowerCase()} date or time.`);
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - MANILA_OFFSET_HOURS, minute));
  const manilaDate = new Date(utcDate.getTime() + MANILA_OFFSET_HOURS * 60 * 60 * 1000);

  if (
    manilaDate.getUTCFullYear() !== year ||
    manilaDate.getUTCMonth() !== month - 1 ||
    manilaDate.getUTCDate() !== day ||
    manilaDate.getUTCHours() !== hour ||
    manilaDate.getUTCMinutes() !== minute
  ) {
    throw new MeetingMutationError(`Invalid ${label.toLowerCase()} date or time.`);
  }

  return utcDate.toISOString();
}

function parseMeetingValues(formData: FormData) {
  const title = readText(formData, "title");
  const description = readText(formData, "description");
  const room = readText(formData, "room");
  const scheduledFor = combineManilaDate(readText(formData, "meetingDate"), readText(formData, "meetingTime"), "Meeting");
  const endTime = readText(formData, "endTime");
  const endsAt = endTime ? combineManilaDate(readText(formData, "meetingDate"), endTime, "Meeting end") : null;

  if (!title) {
    throw new MeetingMutationError("Meeting title is required.");
  }

  if (title.length < 3) {
    throw new MeetingMutationError("Meeting title must be at least 3 characters.");
  }

  if (endsAt && new Date(endsAt).getTime() <= new Date(scheduledFor).getTime()) {
    throw new MeetingMutationError("Meeting end time must be later than the start time.");
  }

  return {
    title,
    description,
    room,
    scheduledFor,
    endsAt,
  };
}

async function loadWriterContext(userId: string) {
  const admin = createAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("email,full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileResult.error) {
    throw new MeetingMutationError(profileResult.error.message, 500);
  }

  const profile = (profileResult.data as WriterProfile | null) ?? null;
  if (!profile) {
    throw new MeetingMutationError("Could not load your account details.", 404);
  }

  return {
    admin,
    actorName: resolveProfileName(profile.full_name, profile.email),
  };
}

async function loadDeactivatedUserIds(admin: ReturnType<typeof createAdminClient>) {
  const authUsersResult = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authUsersResult.error) {
    throw new MeetingMutationError(authUsersResult.error.message, 500);
  }

  return new Set(
    (authUsersResult.data?.users ?? [])
      .filter((user) => {
        const bannedUntil = user.banned_until;
        return typeof bannedUntil === "string" && bannedUntil.length > 0 && new Date(bannedUntil).getTime() > Date.now();
      })
      .map((user) => user.id),
  );
}

function mapMeetingRecipients(rows: MeetingRecipientRow[], deactivatedUserIds: Set<string>) {
  return rows
    .filter((recipient) => !deactivatedUserIds.has(recipient.id))
    .map((recipient) => ({
      id: recipient.id,
      email: recipient.email,
      fullName: resolveProfileName(recipient.full_name, recipient.email),
    }));
}

async function resolveRecipients(
  admin: ReturnType<typeof createAdminClient>,
  participantIds: string[],
  participantRoles: AppRole[],
) {
  if (!participantIds.length && !participantRoles.length) {
    return [];
  }

  const recipientsById = new Map<string, MeetingRecipient>();
  const deactivatedUserIds = await loadDeactivatedUserIds(admin);

  if (participantIds.length) {
    const result = await admin
      .from("profiles")
      .select("id,email,full_name")
      .in("id", participantIds);

    if (result.error) {
      if (isMissingSupabaseTable(result.error)) {
        throw new MeetingMutationError("Profiles are not configured yet.", 500);
      }

      throw new MeetingMutationError(result.error.message, 500);
    }

    for (const recipient of mapMeetingRecipients((result.data as MeetingRecipientRow[] | null) ?? [], deactivatedUserIds)) {
      recipientsById.set(recipient.id, recipient);
    }
  }

  if (participantRoles.length) {
    const result = await admin
      .from("profiles")
      .select("id,email,full_name")
      .in("role", participantRoles);

    if (result.error) {
      if (isMissingSupabaseTable(result.error)) {
        throw new MeetingMutationError("Profiles are not configured yet.", 500);
      }

      throw new MeetingMutationError(result.error.message, 500);
    }

    for (const recipient of mapMeetingRecipients((result.data as MeetingRecipientRow[] | null) ?? [], deactivatedUserIds)) {
      recipientsById.set(recipient.id, recipient);
    }
  }

  return Array.from(recipientsById.values()).sort(
    (left, right) => left.fullName.localeCompare(right.fullName) || left.email.localeCompare(right.email),
  );
}

function buildMeetingSubject(title: string) {
  return `Meeting Scheduled: ${title}`;
}

function buildMeetingMessage({
  actorName,
  title,
  description,
  scheduledFor,
  endsAt,
}: {
  actorName: string;
  title: string;
  description: string;
  scheduledFor: string;
  endsAt: string | null;
}) {
  const scheduleLabel = endsAt
    ? `${formatWithTz(scheduledFor, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })} - ${formatWithTz(endsAt, {
        hour: "numeric",
        minute: "2-digit",
      })}`
    : formatWithTz(scheduledFor, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  const lines = [
    `${actorName} scheduled a meeting for you.`,
    `Meeting: ${title}`,
    `Schedule: ${scheduleLabel}`,
  ];

  if (description) {
    lines.push("", "Meeting details:", description);
  }

  lines.push("", "Open the Assigned Meetings page to review the latest meeting schedule.");
  return lines.join("\n");
}

async function createMeetingNotifications(
  admin: ReturnType<typeof createAdminClient>,
  {
    actorUserId,
    actorName,
    meetingId,
    title,
    description,
    scheduledFor,
    endsAt,
    recipients,
  }: {
    actorUserId: string;
    actorName: string;
    meetingId: number;
    title: string;
    description: string;
    scheduledFor: string;
    endsAt: string | null;
    recipients: MeetingRecipient[];
  },
) {
  if (!recipients.length) {
    return;
  }

  const notificationRows = recipients.map((recipient) => ({
    user_id: recipient.id,
    sender_user_id: actorUserId,
    thread_key: `meeting:${meetingId}`,
    title: buildMeetingSubject(title),
      message: buildMeetingMessage({
        actorName,
        title,
        description,
        scheduledFor,
        endsAt,
      }),
  }));
  const insertResult = await admin.from("notifications").insert(notificationRows);

  if (insertResult.error && !isMissingSupabaseTable(insertResult.error)) {
    if (
      isMissingSupabaseColumn(insertResult.error, "sender_user_id") ||
      isMissingSupabaseColumn(insertResult.error, "thread_key")
    ) {
      const fallbackResult = await admin.from("notifications").insert(
        notificationRows.map((row) => ({
          user_id: row.user_id,
          title: row.title,
          message: row.message,
        })),
      );

      if (fallbackResult.error && !isMissingSupabaseTable(fallbackResult.error)) {
        throw new MeetingMutationError(fallbackResult.error.message, 500);
      }

      return;
    }

    throw new MeetingMutationError(insertResult.error.message, 500);
  }
}

export async function createMeetingForUser(userId: string, formData: FormData) {
  const { admin, actorName } = await loadWriterContext(userId);
  const values = parseMeetingValues(formData);
  const participantIds = parseParticipantIds(formData);
  const participantRoles = parseParticipantRoles(formData);

  if (!participantIds.length && !participantRoles.length) {
    throw new MeetingMutationError("Select at least one meeting participant.");
  }

  const recipients = await resolveRecipients(admin, participantIds, participantRoles);
  if (!recipients.length) {
    throw new MeetingMutationError("No valid meeting participants were found.");
  }

  const now = new Date().toISOString();
  const insertResult = await admin
    .from("meetings")
    .insert({
      title: values.title,
      description: values.description || null,
      room: values.room || null,
      scheduled_for: values.scheduledFor,
      ends_at: values.endsAt,
      created_by: userId,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertResult.error) {
    if (isMissingSupabaseTable(insertResult.error)) {
      throw new MeetingMutationError(
        "Meetings are not configured yet. Run the meetings upgrade SQL before creating meeting records.",
        500,
      );
    }

    throw new MeetingMutationError(insertResult.error.message, 500);
  }

  const meetingId = insertResult.data?.id;
  if (!meetingId) {
    throw new MeetingMutationError("Could not create meeting.", 500);
  }

  const assignmentResult = await admin.from("meeting_assignments").insert(
    recipients.map((recipient) => ({
      meeting_id: meetingId,
      user_id: recipient.id,
    })),
  );

  if (assignmentResult.error) {
    if (isMissingSupabaseTable(assignmentResult.error)) {
      throw new MeetingMutationError(
        "Meeting assignments are not configured yet. Run the meetings upgrade SQL before assigning participants.",
        500,
      );
    }

    throw new MeetingMutationError(assignmentResult.error.message, 500);
  }

  await createMeetingNotifications(admin, {
    actorUserId: userId,
    actorName,
    meetingId,
    title: values.title,
    description: values.description,
    scheduledFor: values.scheduledFor,
    endsAt: values.endsAt,
    recipients,
  });

  return {
    meetingId,
    title: values.title,
    assigneeCount: recipients.length,
  };
}

export async function endMeetingForUser(userId: string, meetingId: number) {
  const { admin } = await loadWriterContext(userId);
  const meetingResult = await admin
    .from("meetings")
    .select("id,title,created_by")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingResult.error) {
    if (isMissingSupabaseTable(meetingResult.error)) {
      throw new MeetingMutationError("Meetings are not configured yet.", 500);
    }

    throw new MeetingMutationError(meetingResult.error.message, 500);
  }

  const meeting = (meetingResult.data as { id: number; title: string; created_by: string | null } | null) ?? null;
  if (!meeting) {
    throw new MeetingMutationError("Meeting not found.", 404);
  }

  if (meeting.created_by && meeting.created_by !== userId) {
    throw new MeetingMutationError("Only the meeting creator can end it.", 403);
  }

  const notificationDeleteResult = await admin.from("notifications").delete().eq("thread_key", `meeting:${meetingId}`);
  if (
    notificationDeleteResult.error &&
    !isMissingSupabaseTable(notificationDeleteResult.error) &&
    !isMissingSupabaseColumn(notificationDeleteResult.error, "thread_key")
  ) {
    throw new MeetingMutationError(notificationDeleteResult.error.message, 500);
  }

  const deleteResult = await admin.from("meetings").delete().eq("id", meetingId);
  if (deleteResult.error) {
    if (isMissingSupabaseTable(deleteResult.error)) {
      throw new MeetingMutationError("Meetings are not configured yet.", 500);
    }

    throw new MeetingMutationError(deleteResult.error.message, 500);
  }

  return {
    meetingId,
    title: meeting.title,
  };
}
