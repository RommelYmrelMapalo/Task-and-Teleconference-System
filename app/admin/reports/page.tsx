import { AdminShell } from "@/components/admin-shell";

export default function ReportsPage() {
  return (
    <AdminShell title="Reports" subtitle="Generate summaries for tasks, meetings, and usage">
      <div className="page-grid three-col">
        <section className="page-card">
          <h3>Task Summary</h3>
          <p>Export task completion and delay metrics.</p>
        </section>
        <section className="page-card">
          <h3>Meeting Summary</h3>
          <p>Review attendance and timing logs.</p>
        </section>
        <section className="page-card">
          <h3>User Activity</h3>
          <p>Audit account activity and notification delivery.</p>
        </section>
      </div>
    </AdminShell>
  );
}
