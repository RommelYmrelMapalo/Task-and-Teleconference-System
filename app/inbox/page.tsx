import { UserShell } from "@/components/user-shell";
import { InboxBrowser } from "@/components/inbox-browser";
import { getInboxContacts, getUserInboxThreads, requireSessionContext } from "@/lib/ttcs-data";

export default async function InboxPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext();
  const [threads, contacts] = await Promise.all([getUserInboxThreads(supabase, profile.id), getInboxContacts(profile.id)]);

  return (
    <UserShell
      title="Inbox"
      subtitle="Reply to admins and review task conversations in one place"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <InboxBrowser
        items={threads}
        emptyLabel="No conversations found."
        viewerLabel={shellUser.fullName}
        contacts={contacts}
      />
    </UserShell>
  );
}
