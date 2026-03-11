import { UserShell } from "@/components/user-shell";
import { InboxBrowser } from "@/components/inbox-browser";
import { getUserNotifications, requireSessionContext } from "@/lib/ttcs-data";

export default async function InboxPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const notifications = await getUserNotifications(supabase, profile.id);

  return (
    <UserShell
      title="Inbox"
      subtitle="Read updates from administrators and the system"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <InboxBrowser items={notifications} emptyLabel="No notifications found." />
    </UserShell>
  );
}
