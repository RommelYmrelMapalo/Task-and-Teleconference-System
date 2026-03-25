import { AdminShell } from "@/components/admin-shell";
import {
  AdminMonitoringEvents,
  type MonitoringSystemEventItem,
} from "@/components/admin-monitoring-events";
import {
  getAdminTaskAuditLogs,
  getAllProfiles,
  getMonitoringNotifications,
  requireSessionContext,
} from "@/lib/ttcs-data";

function buildSystemEvents({
  profiles,
  notifications,
  auditLogs,
}: {
  profiles: Awaited<ReturnType<typeof getAllProfiles>>;
  notifications: Awaited<ReturnType<typeof getMonitoringNotifications>>;
  auditLogs: Awaited<ReturnType<typeof getAdminTaskAuditLogs>>;
}): MonitoringSystemEventItem[] {
  const events: MonitoringSystemEventItem[] = [];

  for (const profile of profiles) {
    events.push({
      id: `profile-created:${profile.id}`,
      kind: "account",
      title: "Account created",
      detail: `${profile.fullName} joined the platform as ${profile.roleLabel}.`,
      meta: profile.email,
      createdAt: profile.createdAt,
      createdLabel: profile.joinedLabel,
    });

    if (profile.lastLoginAt) {
      events.push({
        id: `profile-login:${profile.id}:${profile.lastLoginAt}`,
        kind: "login",
        title: "User login",
        detail: `${profile.fullName} signed in successfully.`,
        meta: profile.lastLoginLabel,
        createdAt: profile.lastLoginAt,
        createdLabel: profile.lastLoginLabel,
      });
    }
  }

  for (const notification of notifications) {
    const directionLabel = notification.isReply
      ? `Reply: ${notification.senderLabel} -> ${notification.recipientLabel}`
      : `From ${notification.senderLabel} to ${notification.recipientLabel}`;

    events.push({
      id: `notification:${notification.id}`,
      kind: "notification",
      title: notification.title || "System notification",
      detail: notification.preview || notification.message,
      meta: directionLabel,
      createdAt: notification.createdAt,
      createdLabel: notification.timeLabel,
    });
  }

  for (const log of auditLogs) {
    events.push({
      id: `audit:${log.id}`,
      kind: "audit",
      title: log.action,
      detail: `${log.actorName} overrode "${log.taskTitle}". ${log.details}`,
      meta: `Task: ${log.taskTitle}`,
      createdAt: log.createdAt,
      createdLabel: log.createdLabel,
    });
  }

  return events.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export default async function MonitoringPage() {
  const { supabase, shellUser, unreadCount } = await requireSessionContext({ admin: true });
  const [profiles, notifications, auditLogs] = await Promise.all([
    getAllProfiles(supabase),
    getMonitoringNotifications(supabase, 500),
    getAdminTaskAuditLogs(supabase, 20),
  ]);
  const systemEvents = buildSystemEvents({ profiles, notifications, auditLogs });

  return (
    <AdminShell
      title="Monitoring Panel"
      subtitle="Recent Supabase-backed account activity and reports"
      contentClassName="monitoring-screen"
      user={shellUser}
      unreadCount={unreadCount}
    >
      <div className="monitoring-page-shell">
        <AdminMonitoringEvents events={systemEvents} />
      </div>
    </AdminShell>
  );
}
