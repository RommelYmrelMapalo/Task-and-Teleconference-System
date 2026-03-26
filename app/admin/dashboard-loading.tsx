import { Skeleton } from "@/components/ui/skeleton";
import { AdminShellLoading } from "@/components/ui/admin-shell-loading";

function SidebarCalendarSkeleton() {
  return (
    <div className="sidebar-calendar-panel">
      <div className="sidebar-mini-calendar">
        <div className="sidebar-mini-calendar-head">
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
        </div>
        <div className="sidebar-mini-calendar-weekdays">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton className="mx-auto h-3 w-6" key={index} />
          ))}
        </div>
        <div className="sidebar-mini-calendar-grid">
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton className="h-8 w-full rounded-[10px]" key={index} />
          ))}
        </div>
      </div>

      <div className="sidebar-calendar-groups">
        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <div className="sidebar-calendar-group" key={groupIndex}>
            <div className="sidebar-calendar-trigger">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-4 w-4 rounded-sm" />
            </div>
            <div className="sidebar-calendar-items">
              {Array.from({ length: 3 }).map((_, itemIndex) => (
                <div className="sidebar-calendar-item" key={itemIndex}>
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardLoading() {
  return (
    <AdminShellLoading sidebarContent={<SidebarCalendarSkeleton />}>
      <div className="admin-dashboard-stack">
        <section className="admin-large-calendar" aria-hidden="true">
          <div className="admin-large-calendar-head">
            <div className="admin-large-calendar-breadcrumb">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-5 w-48" />
            </div>

            <div className="admin-large-calendar-actions">
              <div className="admin-large-calendar-counts">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-8 w-28 rounded-full" key={index} />
                ))}
              </div>
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>

          <div className="admin-large-calendar-weekdays">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton className="mx-auto h-4 w-10" key={index} />
            ))}
          </div>

          <div className="admin-large-calendar-grid">
            {Array.from({ length: 35 }).map((_, index) => (
              <article className="admin-large-calendar-cell" key={index}>
                <div className="admin-large-calendar-cell-top">
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
                <div className="admin-large-calendar-cell-body">
                  {Array.from({ length: index % 3 === 0 ? 3 : 2 }).map((_, chipIndex) => (
                    <Skeleton className="h-9 w-full rounded-xl" key={chipIndex} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShellLoading>
  );
}
