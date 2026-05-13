import { AdminMeetingsManager } from "@/components/admin-meetings-manager";
import { UserShell } from "@/components/user-shell";
import { getAllProfilesForMeetingManagement, requireSessionContext } from "@/lib/ttcs-data";

export default async function MeetingsPage() {
  const { shellUser, unreadCount } = await requireSessionContext();
  const users = await getAllProfilesForMeetingManagement();

  return (
    <UserShell
      title="Manage Meetings"
      subtitle="Create meetings and keep everyone aligned on the latest schedule"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <AdminMeetingsManager users={users} />
    </UserShell>
  );
}
