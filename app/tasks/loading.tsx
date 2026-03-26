import { Skeleton } from "@/components/ui/skeleton";
import { UserShellLoading } from "@/components/ui/user-shell-loading";

function RecentItemSkeleton() {
  return (
    <article className="recent-item" aria-hidden="true">
      <div className="recent-main">
        <Skeleton className="h-7 w-24 rounded-full" />
        <div className="recent-text">
          <Skeleton className="h-4 w-56" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </div>
      <div className="recent-side">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-44" />
      </div>
    </article>
  );
}

function TaskRowSkeleton() {
  return (
    <article className="task-row task-item" aria-hidden="true">
      <div className="task-left">
        <Skeleton className="h-7 w-7 rounded-md" />
        <div className="task-info flex-1">
          <Skeleton className="h-4 w-48" />
          <div className="mt-2 grid gap-2">
            <Skeleton className="h-3 w-full max-w-[28rem]" />
            <Skeleton className="h-3 w-2/3 max-w-[20rem]" />
          </div>
        </div>
        <div className="task-tags">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>

      <div className="task-right">
        <div className="task-actions">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </article>
  );
}

export default function TasksLoading() {
  return (
    <UserShellLoading>
      <div className="taskdash-wrap">
        <div className="td-pills">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton className="h-9 w-28 rounded-full" key={index} />
          ))}
        </div>

        <div className="td-toolbar taskdash-toolbar">
          <Skeleton className="h-11 w-[170px] rounded-[14px]" />
          <Skeleton className="h-11 w-full max-w-[300px] rounded-[14px]" />
        </div>

        <div className="scroll">
          <div className="recent-wrap">
            <Skeleton className="mb-3 h-4 w-56" />
            <div className="recent-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <RecentItemSkeleton key={index} />
              ))}
            </div>
          </div>

          <div className="table-shell">
            {Array.from({ length: 6 }).map((_, index) => (
              <TaskRowSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </UserShellLoading>
  );
}
