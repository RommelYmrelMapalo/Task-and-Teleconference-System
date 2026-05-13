import { AdminShell } from "@/components/admin-shell";
import { MeetingAttendanceTable } from "@/components/meeting-attendance-table";
import { getMeetingAttendanceForUser } from "@/lib/meeting-attendance";
import { requireSessionContext } from "@/lib/ttcs-data";

export default async function AdminRecordTimeInPage() {
  const { supabase, profile, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const attendance = await getMeetingAttendanceForUser({
    supabase,
    userId: profile.id,
    limit: 100,
  });

  return (
    <AdminShell
      title="Meeting Attendance"
      subtitle="Time-in and time-out are recorded automatically when you join and leave the call"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="page-grid">
        <MeetingAttendanceTable
          records={attendance}
          title="Attendance Records"
          description="Open a meeting room from TTCS and your attendance will be tracked automatically from join time through call exit."
          emptyMessage="Meetings will appear here once they are available in the system."
        />
      </div>
    </AdminShell>
  );
}
