"use client";

import { useMemo, useState } from "react";

export type MonitoringSystemEventItem = {
  id: string;
  kind: "account" | "login" | "notification" | "audit";
  title: string;
  detail: string;
  meta: string;
  createdAt: string;
  createdLabel: string;
};

const FILTERS: Array<{
  key: "all" | MonitoringSystemEventItem["kind"];
  label: string;
}> = [
  { key: "all", label: "All events" },
  { key: "account", label: "Accounts" },
  { key: "login", label: "Logins" },
  { key: "notification", label: "Notifications" },
  { key: "audit", label: "Task audits" },
];

const EVENTS_PER_PAGE = 10;

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages: Array<number | "ellipsis"> = [];

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  pages.push(1);

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}

export function AdminMonitoringEvents({ events }: { events: MonitoringSystemEventItem[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredEvents = useMemo(
    () => (filter === "all" ? events : events.filter((event) => event.kind === filter)),
    [events, filter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visiblePages = getVisiblePages(safePage, totalPages);
  const paginatedEvents = useMemo(() => {
    const startIndex = (safePage - 1) * EVENTS_PER_PAGE;
    return filteredEvents.slice(startIndex, startIndex + EVENTS_PER_PAGE);
  }, [filteredEvents, safePage]);

  return (
    <section className="page-card monitoring-events-card">
      <div className="monitoring-events-head">
        <div className="monitoring-events-head-row">
          <div className="card-headline">
            <h3>System Events</h3>
            <span className="soft-badge">{filteredEvents.length}</span>
          </div>
          <div className="monitoring-events-filters" role="tablist" aria-label="Filter system events">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`monitoring-events-filter${filter === item.key ? " active" : ""}`}
                onClick={() => {
                  setFilter(item.key);
                  setCurrentPage(1);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="monitoring-events-list">
        {filteredEvents.length ? (
          paginatedEvents.map((event) => (
            <article className="monitoring-event-row" key={event.id}>
              <div className="monitoring-event-copy">
                <div className="monitoring-event-title-row">
                  <h3>{event.title}</h3>
                  <span className={`monitoring-event-kind kind-${event.kind}`}>{event.kind}</span>
                </div>
                <p>{event.detail}</p>
              </div>
              <div className="monitoring-event-meta">
                <span className="monitoring-event-meta-text">{event.meta}</span>
                <span className="soft-badge">{event.createdLabel}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="monitoring-events-empty">No events match the selected filter.</p>
        )}
      </div>

      <div className="monitoring-events-footer">
        <div className="monitoring-events-count">
          Events per page <span>{EVENTS_PER_PAGE}</span> of {filteredEvents.length} events
        </div>
        <div className="monitoring-events-pagination">
          <button
            type="button"
            className="monitoring-events-page-button"
            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
          >
            {"<"}
          </button>
          {visiblePages.map((page, index) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="monitoring-events-page-ellipsis">
                ...
              </span>
            ) : (
              <button
                type="button"
                key={page}
                className={`monitoring-events-page-button${page === safePage ? " is-active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ),
          )}
          <button
            type="button"
            className="monitoring-events-page-button"
            onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            aria-label="Next page"
          >
            {">"}
          </button>
        </div>
      </div>
    </section>
  );
}
