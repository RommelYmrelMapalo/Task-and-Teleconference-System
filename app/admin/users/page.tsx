import { AdminShell } from "@/components/admin-shell";
import { AdminUserManagement } from "@/components/admin-user-management";
import { getAllProfiles, requireSessionContext } from "@/lib/ttcs-data";

export default async function AdminUsersPage() {
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
