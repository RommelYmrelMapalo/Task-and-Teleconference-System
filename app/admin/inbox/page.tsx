import { AdminShell } from "@/components/admin-shell";
import { InboxBrowser } from "@/components/inbox-browser";
import AdminInboxLoading from "@/app/admin/inbox/loading";
import { Suspense } from "react";
import { getInboxContacts, getUserInboxThreads, requireSessionContext } from "@/lib/ttcs-data";

async function AdminInboxContent() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [threads, contacts] = await Promise.all([getUserInboxThreads(supabase, profile.id), getInboxContacts(profile.id)]);

  return (
    <AdminShell
      title="Inbox"
      subtitle="Manage task conversations and reply to assigned users"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <InboxBrowser
        items={threads}
        emptyLabel="No conversations found."
        viewerLabel={shellUser.fullName}
        contacts={contacts}
      />
    </AdminShell>
  );
}

export default function AdminInboxPage() {
  return (
    <Suspense fallback={<AdminInboxLoading />}>
      <AdminInboxContent />
    </Suspense>
  );
}
