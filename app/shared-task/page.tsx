import { UserShell } from "@/components/user-shell";

export default function SharedTaskPage() {
  return (
    <UserShell title="Shared Task" subtitle="View a task shared through a public or internal link">
      <section className="page-card">
        <h3>Prepare testing handoff notes</h3>
        <p>Priority: High</p>
        <p>Due: March 11, 2026 at 9:00 AM</p>
        <p>
          This page replaces the legacy shared task template. In the Next.js app, the final version
          should be backed by a dynamic route and task lookup API.
        </p>
      </section>
    </UserShell>
  );
}
