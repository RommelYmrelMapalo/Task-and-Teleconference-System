import { UserShell } from "@/components/user-shell";
import { InboxBrowser } from "@/components/inbox-browser";
import InboxLoading from "@/app/inbox/loading";
import { Suspense } from "react";
import { getInboxContacts, getUserInboxThreads, requireSessionContext } from "@/lib/ttcs-data";

async function InboxContent() {
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

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxLoading />}>
      <InboxContent />
    </Suspense>
  );
}
