import type { ReactNode } from "react";
import Link from "next/link";
import { MeetingEmbed } from "@/components/meeting-embed";
import { createJaasJwt, getJaasAppId, hasJaasAppId, hasJaasJwtEnv, buildJaasRoomName } from "@/lib/jaas";
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
  const hasJaasApp = hasJaasAppId();
  const useJaasJwt = hasJaasJwtEnv();
  const useJaas = hasJaasApp && useJaasJwt;
  const jaasAppId = useJaas ? getJaasAppId() : null;
  const embedProps = useJaas
    ? {
        provider: "jaas" as const,
        appId: jaasAppId!,
        roomName: buildJaasRoomName(jaasAppId!, meeting.videoRoomCode),
        jwt: useJaasJwt
          ? createJaasJwt({
              roomCode: meeting.videoRoomCode,
              userId: shellUser.id,
              displayName: shellUser.fullName,
              email: shellUser.email,
              moderator: profile.is_admin,
            })
          : undefined,
        displayName: shellUser.fullName,
        email: shellUser.email,
        title: `${meeting.title} secure video room`,
      }
    : {
        provider: "jitsi" as const,
        iframeUrl: buildMeetingEmbedUrl(meeting.videoRoomCode, shellUser.fullName),
        title: `${meeting.title} video room`,
      };

  return (
    <MeetingAccessShell
      backHref={backHref}
      title={meeting.title}
      subtitle={
        useJaas
          ? useJaasJwt
            ? "Only invited participants can open this secure 8x8 JaaS room through TTCS."
            : "Only invited participants can open this 8x8 JaaS room through TTCS."
          : "Only invited participants can open this video room through TTCS."
      }
    >
      <div className="meeting-room-meta">
        <p>{meeting.dateLabel}</p>
        <p>{meeting.timeLabel}</p>
        <p>{meeting.room ? `Meeting room: ${meeting.room}` : "Meeting room: To be announced"}</p>
        <p>Participants: {participantSummary}</p>
      </div>

      {hasJaasApp && !useJaasJwt ? (
        <section className="page-card meeting-security-card">
          <div className="card-headline">
            <div>
              <h3>Secure meeting authentication is incomplete</h3>
              <p className="meeting-card-copy">
                This 8x8 JaaS room is configured with an App ID but not with participant JWT signing.
              </p>
            </div>
            <span className="pill task">Action needed</span>
          </div>
          <p>
            To require authenticated joins, set <code>JAAS_KID</code> and <code>JAAS_PRIVATE_KEY</code> on the server,
            then reload the meeting page.
          </p>
        </section>
      ) : (
        <MeetingEmbed {...embedProps} />
      )}
    </MeetingAccessShell>
  );
}
