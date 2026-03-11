import { UserShell } from "@/components/user-shell";
import { meetings } from "@/lib/mock-data";

export default function AssignedMeetingsPage() {
  return (
    <UserShell title="Dashboard &nbsp;&rsaquo;&nbsp; Meetings" subtitle="Manage and track your assigned meetings">
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
    </UserShell>
  );
}
