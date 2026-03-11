import { AdminShell } from "@/components/admin-shell";
import { adminStats } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  return (
    <AdminShell title="Admin Dashboard" subtitle="Overview of system activity and task volume">
      <div className="stat-grid">
        {adminStats.map((item) => (
          <section className="page-card stat-card" key={item.label}>
            <p>{item.label}</p>
            <h3>{item.value}</h3>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
