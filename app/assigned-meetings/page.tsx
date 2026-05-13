import Link from "next/link";
import { UserShell } from "@/components/user-shell";
import { getUserMeetings } from "@/lib/meeting-data";
import type { MeetingItem } from "@/lib/ttcs-data";
import { requireSessionContext } from "@/lib/ttcs-data";

function canJoinMeeting(meeting: MeetingItem) {
  const closesAt = meeting.endDateTime ?? meeting.dateTime;
  return new Date(closesAt).getTime() >= Date.now();
}

export default async function AssignedMeetingsPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const meetings = await getUserMeetings(supabase, profile.id, 50);

  return (
    <UserShell
      title="Assigned Meetings"
      subtitle="Meeting schedules assigned to your account"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="page-grid two-col">
        {meetings.length ? (
          meetings.map((meeting) => {
            return (
              <section className="page-card" key={meeting.id}>
                <div className="card-headline">
                  <h3>{meeting.title}</h3>
                  <span className="pill meeting">Meeting</span>
                </div>
                <p>{meeting.dateLabel}</p>
                <p>{meeting.timeLabel}</p>
                <p>{meeting.description}</p>
                {meeting.joinPath && canJoinMeeting(meeting) ? (
                  <div className="meeting-link-actions">
                    <Link className="primary-btn" href={meeting.joinPath}>
                      Join Meeting
                    </Link>
                  </div>
                ) : null}
              </section>
            );
          })
        ) : (
            <section className="page-card">
              <h3>No meetings assigned</h3>
              <p>Assigned meetings will appear here as soon as someone schedules them for your account.</p>
            </section>
          )}
      </div>
    </UserShell>
  );
}
