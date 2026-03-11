import { AdminShell } from "@/components/admin-shell";
import { inboxItems } from "@/lib/mock-data";

export default function AdminInboxPage() {
  return (
    <AdminShell title="Inbox" subtitle="Review administrative notifications and replies">
      <div className="page-grid inbox-grid">
        <section className="page-card">
          <div className="card-headline">
            <h3>Admin Inbox</h3>
            <span className="soft-badge">{inboxItems.length}</span>
          </div>
          <div className="list-stack">
            {inboxItems.map((item) => (
              <article className="mail-item" key={item.id}>
                <div className="mail-item-head">
                  <strong>{item.subject}</strong>
                  <span>{item.time}</span>
                </div>
                <p>{item.sender}</p>
                <p>{item.preview}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="page-card">
          <h3>Reader</h3>
          <p>Use this panel for full-message content and moderation actions.</p>
        </section>
      </div>
    </AdminShell>
  );
}
