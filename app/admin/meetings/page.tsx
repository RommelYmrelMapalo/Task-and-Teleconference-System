import { AdminShell } from "@/components/admin-shell";
import { meetings } from "@/lib/mock-data";

export default function AdminMeetingsPage() {
  return (
    <AdminShell title="Manage Meetings" subtitle="Assign, edit, and review meeting schedules">
      <div className="page-grid two-col">
        {meetings.map((meeting) => (
          <section className="page-card" key={meeting.id}>
            <div className="card-headline">
              <h3>{meeting.title}</h3>
              <span className="pill meeting">Meeting</span>
            </div>
            <p>{meeting.time}</p>
            <p>{meeting.room}</p>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
