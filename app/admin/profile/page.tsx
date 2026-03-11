import { AdminShell } from "@/components/admin-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { requireSessionContext } from "@/lib/ttcs-data";

export default async function AdminProfilePage() {
  const { shellUser, unreadCount } = await requireSessionContext({ admin: true });

  return (
    <AdminShell
      title="Profile"
      subtitle="Manage administrative account details"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <ProfileEditor user={shellUser} heading="Admin Profile" />
    </AdminShell>
  );
}
