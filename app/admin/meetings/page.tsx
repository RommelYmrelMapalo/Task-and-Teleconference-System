import { AdminShell } from "@/components/admin-shell";
import { getAllNotifications, getMeetingItems, requireSessionContext } from "@/lib/ttcs-data";

export default async function AdminMeetingsPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const meetings = getMeetingItems(await getAllNotifications(supabase, 100));

  return (
    <AdminShell
      title="Manage Meetings"
      subtitle="Meeting-related notices currently stored in Supabase"
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
            <h3>No meeting notices found</h3>
            <p>The current schema still derives meetings from notifications.</p>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
