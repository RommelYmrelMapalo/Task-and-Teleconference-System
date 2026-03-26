import { Skeleton } from "@/components/ui/skeleton";
import { UserShellLoading } from "@/components/ui/user-shell-loading";

function InboxListItemSkeleton() {
  return (
    <div className="inbox-list-card" aria-hidden="true">
      <div className="inbox-list-item inbox-page-list-item">
        <div className="inbox-thread-list-head">
          <div className="inbox-thread-list-person">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="mt-3 h-4 w-40" />
        <div className="mt-2 grid gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

function InboxMessageSkeleton({ outgoing = false }: { outgoing?: boolean }) {
  return (
    <article className={`inbox-message-card${outgoing ? " outgoing" : ""}`} aria-hidden="true">
      <div className="inbox-message-meta">
        <div className="inbox-message-author">
          <Skeleton className="h-[42px] w-[42px] rounded-[14px]" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mt-4 h-3 w-24" />
      <div className="mt-4 grid gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </article>
  );
}

export default function InboxLoading() {
  return (
    <UserShellLoading>
      <div className="inbox-shell inbox-page">
        <div className="inbox-toolbar inbox-page-toolbar">
          <div className="inbox-toolbar-main">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 flex-1 rounded-[14px]" />
          </div>
          <div className="inbox-toolbar-status">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>

        <div className="inbox-layout inbox-page-layout">
          <section className="inbox-list-panel inbox-page-list-panel">
            <div className="inbox-panel-head inbox-page-panel-head">
              <div className="inbox-panel-head-main">
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="inbox-panel-head-actions">
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-full" />
              </div>
            </div>

            <div className="td-pills inbox-filter-pills">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-8 w-24 rounded-full" key={index} />
              ))}
            </div>

            <div className="inbox-list inbox-page-list">
              {Array.from({ length: 5 }).map((_, index) => (
                <InboxListItemSkeleton key={index} />
              ))}
            </div>
          </section>

          <section className="inbox-reader-panel inbox-page-reader-panel">
            <div className="inbox-thread-view">
              <div className="inbox-thread-head">
                <div className="flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-8 w-56" />
                  <Skeleton className="mt-3 h-4 w-72" />
                </div>
                <div className="inbox-thread-head-badges">
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>

              <div className="inbox-thread-messages">
                <InboxMessageSkeleton />
                <InboxMessageSkeleton outgoing />
                <InboxMessageSkeleton />
              </div>

              <div className="inbox-composer">
                <div className="inbox-composer-head">
                  <div>
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-2 h-4 w-72" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full rounded-[18px]" />
                <div className="inbox-composer-actions">
                  <Skeleton className="h-4 w-52" />
                  <div className="inbox-composer-button-group">
                    <Skeleton className="h-9 w-20 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </UserShellLoading>
  );
}
