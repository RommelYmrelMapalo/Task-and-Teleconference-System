import type { ReactNode } from "react";
import Link from "next/link";
import { buildMeetingEmbedUrl } from "@/lib/meeting-links";
import { getMeetingByIdForUser } from "@/lib/meeting-data";
import { requireSessionContext } from "@/lib/ttcs-data";

function MeetingAccessShell({
  backHref,
  title,
  subtitle,
  children,
}: {
  backHref: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="meeting-room-page">
      <div className="meeting-room-shell">
        <div className="meeting-room-topbar">
          <Link className="meeting-room-backlink" href={backHref}>
            Back
          </Link>
          <div className="meeting-room-brand">
            <span>TASK AND TELECONFERENCE SYSTEM</span>
          </div>
        </div>

        <section className="page-card meeting-room-card">
          <div className="card-headline">
            <div>
              <h3>{title}</h3>
              <p className="meeting-card-copy">{subtitle}</p>
            </div>
            <span className="pill meeting">Meeting</span>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export default async function MeetingRoomPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId: meetingIdParam } = await params;
  const meetingId = Number(meetingIdParam);
  const { profile, shellUser } = await requireSessionContext();
  const backHref = profile.is_admin ? "/admin/meetings" : "/assigned-meetings";

  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    return (
      <MeetingAccessShell
        backHref={backHref}
        title="Meeting not found"
        subtitle="The meeting link is invalid or no longer available."
      >
        <p>Check the meeting link from your schedule and try again.</p>
      </MeetingAccessShell>
    );
  }

  const meeting = await getMeetingByIdForUser({
    meetingId,
    userId: profile.id,
    isAdmin: profile.is_admin,
  });

  if (!meeting) {
    return (
      <MeetingAccessShell
        backHref={backHref}
        title="Access restricted"
        subtitle="Only assigned participants and admins can open this meeting room."
      >
        <p>If you believe this is a mistake, ask the meeting organizer to verify your invitation.</p>
      </MeetingAccessShell>
    );
  }

  const participantSummary = meeting.assignees.length
    ? meeting.assignees.map((assignee) => assignee.fullName).join(", ")
    : "No participants listed";
  const embedUrl = buildMeetingEmbedUrl(meeting.videoRoomCode, shellUser.fullName);

  return (
    <MeetingAccessShell
      backHref={backHref}
      title={meeting.title}
      subtitle="Only invited participants can open this video room through TTCS."
    >
      <div className="meeting-room-meta">
        <p>{meeting.dateLabel}</p>
        <p>{meeting.timeLabel}</p>
        <p>{meeting.room ? `Meeting room: ${meeting.room}` : "Meeting room: To be announced"}</p>
        <p>Participants: {participantSummary}</p>
      </div>

      <div className="meeting-video-frame-shell">
        <iframe
          title={`${meeting.title} video room`}
          className="meeting-video-frame"
          src={embedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          referrerPolicy="origin"
        />
      </div>
    </MeetingAccessShell>
  );
}
