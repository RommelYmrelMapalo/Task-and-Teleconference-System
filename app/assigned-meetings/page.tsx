import { UserShell } from "@/components/user-shell";
import { getMeetingItems, getUserNotifications, requireSessionContext } from "@/lib/ttcs-data";

export default async function AssignedMeetingsPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const notifications = await getUserNotifications(supabase, profile.id, 50);
  const meetings = getMeetingItems(notifications);

  return (
    <UserShell
      title="Assigned Meetings"
      subtitle="Meeting-related notifications assigned to your account"
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
              <p>{meeting.description}</p>
            </section>
          ))
        ) : (
          <section className="page-card">
            <h3>No meetings assigned</h3>
            <p>Meeting notices will appear here after they are sent to your account.</p>
          </section>
        )}
      </div>
    </UserShell>
  );
}
