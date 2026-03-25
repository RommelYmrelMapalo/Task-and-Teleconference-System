import { Skeleton } from "@/components/ui/skeleton";

function SidebarSkeleton() {
  return (
    <aside className="sidebar-dark">
      <div className="sidebar-brand">
        <div className="sidebar-brand-main">
          <Skeleton className="h-[54px] w-[54px] rounded-2xl" />
          <div className="grid gap-2 pt-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-[30px] w-[30px] rounded-[8px]" />
      </div>

      <div className="sidebar-nav">
        {["MAIN", "TASKS", "TELECONFERENCE"].map((section, sectionIndex) => (
          <div key={section} className="sidebar-group">
            <div className="sidebar-section">{section}</div>
            <div className="grid gap-2">
              {Array.from({ length: sectionIndex === 2 ? 4 : 1 }).map((_, itemIndex) => (
                <div
                  key={`${section}-${itemIndex}`}
                  className="flex items-center gap-3 rounded-xl border border-white/5 px-4 py-3"
                >
                  <Skeleton className="h-[18px] w-[18px] rounded-md" />
                  <Skeleton className="h-4 flex-1" />
                  {section === "TELECONFERENCE" && itemIndex === 3 ? (
                    <Skeleton className="h-6 w-8 rounded-full" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-trigger">
          <div className="user-row">
            <Skeleton className="user-avatar rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-4 rounded-sm" />
        </div>
      </div>
    </aside>
  );
}

function DashboardCardsSkeleton() {
  return (
    <div className="planner-wrap card-view" aria-label="Loading dashboard content">
      <div className="card-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <article className="gcard" key={index}>
            <div className="gcard-cover p-4">
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid gap-4 p-5">
              <div className="grid gap-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <main className="dashboard-page">
      <div className="app-shell">
        <SidebarSkeleton />

        <section className="main-area">
          <div className="content-wrap">
            <div className="main-inner">
              <div className="dashboard-head">
                <div className="dashboard-head-left">
                  <div className="page-breadcrumbs-shell">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-14" />
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-56" />
                  </div>
                </div>

                <div className="planner-actions-top">
                  <Skeleton className="h-9 w-20 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                </div>
              </div>

              <DashboardCardsSkeleton />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
