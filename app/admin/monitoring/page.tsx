import { AdminShell } from "@/components/admin-shell";

export default function MonitoringPage() {
  return (
    <AdminShell title="Monitoring Panel" subtitle="Track active users and submitted logs">
      <section className="page-card">
        <h3>Activity Stream</h3>
        <div className="list-stack">
          <article className="table-row">
            <div>
              <h3>Juan Student</h3>
              <p>Recorded time-in for Capstone checkpoint</p>
            </div>
            <span className="soft-badge">08:45 AM</span>
          </article>
          <article className="table-row">
            <div>
              <h3>Maria Cruz</h3>
              <p>Completed task update on task dashboard</p>
            </div>
            <span className="soft-badge">09:10 AM</span>
          </article>
        </div>
      </section>
    </AdminShell>
  );
}
