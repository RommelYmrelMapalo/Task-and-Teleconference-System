import { Skeleton } from "@/components/ui/skeleton";
import { AdminShellLoading } from "@/components/ui/admin-shell-loading";

function UserRowSkeleton() {
  return (
    <tr aria-hidden="true">
      <td className="manage-users-checkbox-col">
        <Skeleton className="h-4 w-4 rounded-sm" />
      </td>
      <td>
        <div className="manage-users-name-cell">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </td>
      <td><Skeleton className="h-4 w-44" /></td>
      <td><Skeleton className="h-4 w-24" /></td>
      <td><Skeleton className="h-7 w-20 rounded-full" /></td>
      <td><Skeleton className="h-4 w-16" /></td>
      <td><Skeleton className="h-4 w-24" /></td>
      <td><Skeleton className="h-4 w-24" /></td>
      <td className="manage-users-actions-col">
        <div className="manage-users-row-actions">
          <Skeleton className="h-9 w-9 rounded-[12px]" />
          <Skeleton className="h-9 w-9 rounded-[12px]" />
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsersLoading() {
  return (
    <AdminShellLoading>
      <div className="manage-users-layout">
        <section className="manage-users-panel" aria-hidden="true">
          <div className="manage-users-toolbar">
            <div className="manage-users-search">
              <Skeleton className="h-5 w-5 rounded-sm" />
              <Skeleton className="h-4 flex-1" />
            </div>

            <div className="manage-users-filters">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="manage-users-filter" key={index}>
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </div>
              ))}
            </div>

            <div className="manage-users-toolbar-actions">
              <Skeleton className="h-11 w-28 rounded-[16px]" />
              <Skeleton className="h-11 w-32 rounded-[16px]" />
            </div>
          </div>

          <div className="manage-users-table-wrap">
            <table className="manage-users-table">
              <thead>
                <tr>
                  <th className="manage-users-checkbox-col" />
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th>Last Active</th>
                  <th className="manage-users-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, index) => (
                  <UserRowSkeleton key={index} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="manage-users-footer">
            <Skeleton className="h-4 w-48" />
            <div className="manage-users-pagination">
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
