import { UserShell } from "@/components/user-shell";
import { getMeetingItems, getUserNotifications, requireSessionContext } from "@/lib/ttcs-data";

export default async function RecordTimeInPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const meetings = getMeetingItems(await getUserNotifications(supabase, profile.id, 20));

  return (
    <UserShell
      title="Record Time-in"
      subtitle="Select an assigned meeting before registering attendance"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="form-grid">
        <section className="page-card">
          <h3>Meeting Time-in</h3>
          <p>This page now reads meeting options from Supabase notifications. Attendance submission still needs a dedicated table.</p>
          <div className="form-stack">
            <div className="select-shell">
              <select className="field-input field-select" defaultValue={meetings[0]?.id ?? ""}>
                {meetings.length ? (
                  meetings.map((meeting) => (
                    <option key={meeting.id} value={meeting.id}>
                      {meeting.title} - {meeting.dateLabel}
                    </option>
                  ))
                ) : (
                  <option value="">No assigned meetings</option>
                )}
              </select>
              <span className="select-arrow" aria-hidden="true" />
            </div>
            <input className="field-input" defaultValue={new Date().toLocaleTimeString("en-US")} />
            <button className="primary-btn" type="button" disabled>
              Attendance Table Required
            </button>
          </div>
        </section>
      </div>
    </UserShell>
  );
}
