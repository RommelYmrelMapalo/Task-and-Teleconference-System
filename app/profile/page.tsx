import { UserShell } from "@/components/user-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { requireSessionContext } from "@/lib/ttcs-data";

export default async function ProfilePage() {
  const { shellUser, unreadCount } = await requireSessionContext();

  return (
    <UserShell
      title="Profile"
      subtitle="Manage your account information and password"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <ProfileEditor user={shellUser} heading="Profile Name" />
    </UserShell>
  );
}
