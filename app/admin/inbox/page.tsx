import { AdminShell } from "@/components/admin-shell";
import { InboxBrowser } from "@/components/inbox-browser";
import { getUserNotifications, requireSessionContext } from "@/lib/ttcs-data";

export default async function AdminInboxPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const notifications = await getUserNotifications(supabase, profile.id);

  return (
    <AdminShell
      title="Inbox"
      subtitle="Review administrative notifications"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <InboxBrowser items={notifications} emptyLabel="No admin notifications found." />
    </AdminShell>
  );
}
