import { createHash } from "crypto";

function slugifySegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "meeting";
}

export function buildMeetingJoinPath(meetingId: number) {
  return `/meetings/${meetingId}`;
}

export function buildMeetingVideoRoomCode({
  meetingId,
  title,
  createdAt,
}: {
  meetingId: number;
  title: string;
  createdAt: string;
}) {
  const slug = slugifySegment(title).slice(0, 24);
  const digest = createHash("sha256")
    .update(`${meetingId}:${createdAt}:${title}`)
    .digest("hex")
    .slice(0, 16);

  return `ttcs-${meetingId}-${slug}-${digest}`;
}

export function buildMeetingEmbedUrl(roomCode: string, displayName: string) {
  const hashParams = new URLSearchParams();
  hashParams.set("config.prejoinPageEnabled", "false");

  if (displayName.trim()) {
    hashParams.set("userInfo.displayName", JSON.stringify(displayName.trim()));
  }

  return `https://meet.jit.si/${encodeURIComponent(roomCode)}#${hashParams.toString()}`;
}
