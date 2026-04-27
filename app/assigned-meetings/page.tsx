import { UserShell } from "@/components/user-shell";
import { getUserMeetings } from "@/lib/meeting-data";
import { requireSessionContext } from "@/lib/ttcs-data";

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
          meetings.map((meeting) => (
            <section className="page-card" key={meeting.id}>
              <div className="card-headline">
                <h3>{meeting.title}</h3>
                <span className="pill meeting">Meeting</span>
              </div>
              <p>{meeting.dateLabel}</p>
              <p>{meeting.timeLabel}</p>
              <p>{meeting.room ? `Room: ${meeting.room}` : "Room: To be announced"}</p>
              <p>{meeting.description}</p>
            </section>
          ))
        ) : (
            <section className="page-card">
              <h3>No meetings assigned</h3>
              <p>Assigned meetings will appear here as soon as an admin schedules them for your account.</p>
            </section>
          )}
      </div>
    </UserShell>
  );
}
