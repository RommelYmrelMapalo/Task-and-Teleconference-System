import { Skeleton } from "@/components/ui/skeleton";
import { AdminShellLoading } from "@/components/ui/admin-shell-loading";

function MonitoringRowSkeleton() {
  return (
    <article className="monitoring-event-row" aria-hidden="true">
      <div className="monitoring-event-copy">
        <div className="monitoring-event-title-row">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="mt-3 grid gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
        </div>
      </div>
      <div className="monitoring-event-meta">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
    </article>
  );
}

export default function AdminMonitoringLoading() {
  return (
    <AdminShellLoading contentClassName="monitoring-screen">
      <div className="monitoring-page-shell">
        <section className="page-card monitoring-events-card" aria-hidden="true">
          <div className="monitoring-events-head">
            <div className="monitoring-events-head-row">
              <div className="card-headline">
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-7 w-12 rounded-full" />
              </div>
              <div className="monitoring-events-toolbar">
                <div className="monitoring-events-filters">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton className="h-9 w-24 rounded-full" key={index} />
                  ))}
                </div>
                <Skeleton className="h-10 w-28 rounded-full" />
              </div>
            </div>
          </div>

          <div className="monitoring-events-list">
            {Array.from({ length: 6 }).map((_, index) => (
              <MonitoringRowSkeleton key={index} />
            ))}
          </div>

          <div className="monitoring-events-footer">
            <Skeleton className="h-4 w-56" />
            <div className="monitoring-events-pagination">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton className="h-9 w-9 rounded-full" key={index} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShellLoading>
  );
}
