import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AdminMeetingsManager } from "@/components/admin-meetings-manager";
import { getAllProfiles, requireSessionContext } from "@/lib/ttcs-data";

async function AdminMeetingsContent() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const users = await getAllProfiles(supabase);

  return (
    <AdminShell
      title="Manage Meetings"
      subtitle="Create meetings and keep assigned schedules in sync across the system"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <AdminMeetingsManager users={users} />
    </AdminShell>
  );
}

export default function AdminMeetingsPage() {
  return (
    <Suspense fallback={null}>
      <AdminMeetingsContent />
    </Suspense>
  );
}
