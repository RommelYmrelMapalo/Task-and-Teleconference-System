"use client";

import { useMemo, useState } from "react";
import { TablePagination } from "./ui/table-pagination";

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

const MONITORING_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50] as const;
const EVENT_KIND_LABELS: Record<MonitoringSystemEventItem["kind"], string> = {
  account: "Account",
  login: "Login",
  notification: "Notification",
  audit: "Task audit",
};

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function buildMonitoringCsv(events: MonitoringSystemEventItem[]) {
  const header = ["Event type", "Title", "Details", "Context", "Timestamp"];
  const rows = events.map((event) =>
    [
      EVENT_KIND_LABELS[event.kind],
      event.title,
      event.detail,
      event.meta,
      event.createdAt,
    ]
      .map((value) => escapeCsvValue(value))
      .join(","),
  );

  return [header.map((value) => escapeCsvValue(value)).join(","), ...rows].join("\n");
}

function buildExportFileName(filter: (typeof FILTERS)[number]["key"]) {
  const stamp = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return `ttcs-system-logs-${filter}-${stamp}.csv`;
}

export function AdminMonitoringEvents({ events }: { events: MonitoringSystemEventItem[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<(typeof MONITORING_ROWS_PER_PAGE_OPTIONS)[number]>(10);

  const filteredEvents = useMemo(
    () => (filter === "all" ? events : events.filter((event) => event.kind === filter)),
    [events, filter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEvents = useMemo(() => {
    const startIndex = (safePage - 1) * rowsPerPage;
    return filteredEvents.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredEvents, rowsPerPage, safePage]);

  function handleExport() {
    const csv = buildMonitoringCsv(filteredEvents);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildExportFileName(filter);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="page-card monitoring-events-card">
      <div className="monitoring-events-head">
        <div className="monitoring-events-head-row">
          <div className="card-headline">
            <h3>System Events</h3>
            <span className="soft-badge">{filteredEvents.length}</span>
          </div>
          <div className="monitoring-events-toolbar">
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
            <button
              type="button"
              className="monitoring-events-export-button"
              onClick={handleExport}
              disabled={!filteredEvents.length}
            >
              Export logs
            </button>
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
                  <span className={`monitoring-event-kind kind-${event.kind}`}>{EVENT_KIND_LABELS[event.kind]}</span>
                </div>
                <p>{event.detail}</p>
              </div>
              <div className="monitoring-event-meta">
                <span className="soft-badge">{event.createdLabel}</span>
                <span className="monitoring-event-meta-text">{event.meta}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="monitoring-events-empty">No events match the selected filter.</p>
        )}
      </div>

      <div className="monitoring-events-footer">
        <TablePagination
          currentPage={safePage}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={MONITORING_ROWS_PER_PAGE_OPTIONS}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage(Math.max(1, safePage - 1))}
          onNext={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value as (typeof MONITORING_ROWS_PER_PAGE_OPTIONS)[number]);
            setCurrentPage(1);
          }}
        />
      </div>
    </section>
  );
}
