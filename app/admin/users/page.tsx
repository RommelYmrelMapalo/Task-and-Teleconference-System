import { AdminShell } from "@/components/admin-shell";
import { AdminUserManagement } from "@/components/admin-user-management";
import AdminUsersLoading from "@/app/admin/users/loading";
import { Suspense } from "react";
import { getAllProfiles, requireSessionContext } from "@/lib/ttcs-data";

async function AdminUsersContent() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const users = await getAllProfiles(supabase);

  return (
    <AdminShell
      title=""
      user={shellUser}
      unreadCount={unreadCount}
    >
      <AdminUserManagement users={users} />
    </AdminShell>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminUsersLoading />}>
      <AdminUsersContent />
    </Suspense>
  );
}
