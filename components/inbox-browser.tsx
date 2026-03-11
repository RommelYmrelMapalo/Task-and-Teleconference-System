"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/utils/supabase/client";
import type { NotificationItem } from "@/lib/ttcs-data";

export function InboxBrowser({
  items,
  emptyLabel,
}: {
  items: NotificationItem[];
  emptyLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState(items);
  const [selectedId, setSelectedId] = useState<number | null>(items[0]?.id ?? null);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return notifications;
    }

    return notifications.filter((item) =>
      `${item.subject} ${item.preview} ${item.sender}`.toLowerCase().includes(trimmed),
    );
  }, [notifications, query]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const unreadCount = filteredItems.filter((item) => !item.isRead).length;

  const openItem = (id: number) => {
    setSelectedId(id);

    const current = notifications.find((item) => item.id === id);
    if (!current || current.isRead) {
      return;
    }

    setNotifications((existing) =>
      existing.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );

    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      router.refresh();
    });
  };

  return (
    <div className="inbox-shell inbox-page">
      <div className="inbox-toolbar inbox-page-toolbar">
        <input
          className="inbox-search"
          placeholder="Search notifications..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="inbox-toolbar-badge">
          Showing {filteredItems.length} of {notifications.length}
        </div>
      </div>

      <div className="inbox-layout inbox-page-layout">
        <section className="inbox-list-panel inbox-page-list-panel">
          <div className="inbox-panel-head inbox-page-panel-head">
            <h3>Inbox</h3>
            <span className="soft-badge">
              {unreadCount} unread{isPending ? " ..." : ""}
            </span>
          </div>

          <div className="inbox-list inbox-page-list">
            {filteredItems.map((item) => {
              const active = selectedItem?.id === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`inbox-list-item inbox-page-list-item${active ? " active" : ""}`}
                  onClick={() => openItem(item.id)}
                >
                  <div className="inbox-list-row inbox-page-list-row">
                    <strong>{item.subject}</strong>
                    <span>{item.timeLabel}</span>
                  </div>
                  <p>{item.preview}</p>
                </button>
              );
            })}
            {!filteredItems.length ? <div className="task-empty">{emptyLabel}</div> : null}
          </div>
        </section>

        <section className="inbox-reader-panel inbox-page-reader-panel">
          {selectedItem ? (
            <article className="page-card">
              <div className="card-headline">
                <h3>{selectedItem.subject}</h3>
                <span className="soft-badge">{selectedItem.timeLabel}</span>
              </div>
              <p>{selectedItem.sender}</p>
              <p>{selectedItem.preview}</p>
            </article>
          ) : (
            <div className="inbox-reader-content inbox-page-reader-content">
              <div className="inbox-reader-icon inbox-page-reader-icon" aria-hidden="true">
                {"\uD83D\uDCE5"}
              </div>
              <div className="inbox-reader-message inbox-page-reader-message">{emptyLabel}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
