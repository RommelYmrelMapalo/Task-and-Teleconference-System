import { AdminShell } from "@/components/admin-shell";
import {
  AdminMonitoringEvents,
  type MonitoringSystemEventItem,
} from "@/components/admin-monitoring-events";
import AdminMonitoringLoading from "@/app/admin/monitoring/loading";
import { Suspense } from "react";
import {
  getAdminTaskAuditLogs,
  getAllProfiles,
  type MonitoringNotificationItem,
  getMonitoringNotifications,
  requireSessionContext,
} from "@/lib/ttcs-data";

function summarizeRecipients(recipients: string[]) {
  if (!recipients.length) {
    return "Unknown recipient";
  }

  if (recipients.length <= 3) {
    return recipients.join(", ");
  }

  return `${recipients.slice(0, 3).join(", ")} +${recipients.length - 3} more`;
}

function groupMonitoringNotifications(notifications: MonitoringNotificationItem[]) {
  const grouped = new Map<
    string,
    {
      base: MonitoringNotificationItem;
      recipients: string[];
    }
  >();

  for (const notification of notifications) {
    const groupKey = notification.isReply
      ? `reply:${notification.id}`
      : `${notification.threadKey ?? notification.id}:${notification.title}:${notification.createdAt}:${notification.senderLabel}`;
    const existing = grouped.get(groupKey);

    if (existing) {
      if (!existing.recipients.includes(notification.recipientLabel)) {
        existing.recipients.push(notification.recipientLabel);
      }
      continue;
    }

    grouped.set(groupKey, {
      base: notification,
      recipients: [notification.recipientLabel],
    });
  }

  return Array.from(grouped.values()).map(({ base, recipients }) => {
    const meta = base.isReply
      ? `Reply: ${base.senderLabel} -> ${base.recipientLabel}`
      : `From ${base.senderLabel} to ${summarizeRecipients(recipients)}`;

    return {
      id: base.isReply ? `notification:${base.id}` : `notification-group:${base.threadKey ?? base.id}:${base.createdAt}`,
      kind: "notification" as const,
      title: base.title || "System notification",
      detail: base.preview || base.message,
      meta,
      createdAt: base.createdAt,
      createdLabel: base.timeLabel,
    };
  });
}

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
        meta: profile.email,
        createdAt: profile.lastLoginAt,
        createdLabel: profile.lastLoginLabel,
      });
    }
  }

  events.push(...groupMonitoringNotifications(notifications));

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

async function MonitoringContent() {
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

export default function MonitoringPage() {
  return (
    <Suspense fallback={<AdminMonitoringLoading />}>
      <MonitoringContent />
    </Suspense>
  );
}
