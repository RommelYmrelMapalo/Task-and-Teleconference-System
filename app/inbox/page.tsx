"use client";

import { UserShell } from "@/components/user-shell";
import { inboxItems } from "@/lib/mock-data";
import { useMemo, useState } from "react";

export default function InboxPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(inboxItems[0]?.id ?? null);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return inboxItems;

    return inboxItems.filter((item) =>
      `${item.subject} ${item.sender} ${item.preview}`.toLowerCase().includes(trimmed),
    );
  }, [query]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;

  const unreadCount = filteredItems.filter((item) => item.unread).length;

  return (
    <UserShell title="Dashboard &nbsp;&rsaquo;&nbsp; Inbox" subtitle="Read updates from administrators and the system">
      <div className="inbox-shell inbox-page">
        <div className="inbox-toolbar inbox-page-toolbar">
          <input
            className="inbox-search"
            placeholder="Search notifications..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="inbox-toolbar-badge">Showing {filteredItems.length} of {inboxItems.length}</div>
        </div>

        <div className="inbox-layout inbox-page-layout">
          <section className="inbox-list-panel inbox-page-list-panel">
            <div className="inbox-panel-head inbox-page-panel-head">
              <h3>Inbox</h3>
              <span className="soft-badge">{unreadCount} unread</span>
            </div>

            <div className="inbox-list inbox-page-list">
              {filteredItems.map((item) => {
                const active = selectedItem?.id === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`inbox-list-item inbox-page-list-item${active ? " active" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="inbox-list-row inbox-page-list-row">
                      <strong>{item.subject}</strong>
                      <span>{item.time}</span>
                    </div>
                    <p>{item.preview}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="inbox-reader-panel inbox-page-reader-panel">
            {selectedItem ? (
              <div className="inbox-reader-content inbox-page-reader-content">
                <div className="inbox-reader-icon inbox-page-reader-icon" aria-hidden="true">
                  {"\uD83D\uDCE5"}
                </div>
                <div className="inbox-reader-message inbox-page-reader-message">Select a notification to read.</div>
              </div>
            ) : (
              <div className="inbox-reader-content inbox-page-reader-content">
                <div className="inbox-reader-icon inbox-page-reader-icon" aria-hidden="true">
                  {"\uD83D\uDCE5"}
                </div>
                <div className="inbox-reader-message inbox-page-reader-message">No notifications found.</div>
              </div>
            )}
          </section>
        </div>
      </div>
    </UserShell>
  );
}
