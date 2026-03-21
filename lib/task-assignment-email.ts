const RESEND_API_URL = "https://api.resend.com/emails";
const APP_TIME_ZONE = "Asia/Manila";

export type TaskAssignmentEmailRecipient = {
  email: string | null | undefined;
  fullName: string;
};

type TaskAssignmentEmailInput = {
  recipient: TaskAssignmentEmailRecipient;
  actorName: string;
  taskId: number;
  taskTitle: string;
  description?: string | null;
  deadline?: string | null;
  priority: string;
  status: string;
};

type TaskAssignmentEmailConfig = {
  apiKey: string;
  from: string;
  replyTo?: string;
  appBaseUrl?: string;
};

function normalizeEmailAddress(value: string | null | undefined) {
  const email = value?.trim();
  if (!email || !email.includes("@")) {
    return null;
  }

  return email;
}

function normalizeBaseUrl(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) {
    return undefined;
  }

  try {
    const url = new URL(candidate);
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function getEmailConfig(): TaskAssignmentEmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TASK_NOTIFICATION_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return null;
  }

  return {
    apiKey,
    from,
    replyTo: normalizeEmailAddress(process.env.TASK_NOTIFICATION_REPLY_TO_EMAIL),
    appBaseUrl: normalizeBaseUrl(
      process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL,
    ),
  };
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatPriorityLabel(priority: string) {
  if (!priority) {
    return "Normal";
  }

  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
}

function formatDeadlineLabel(deadline: string | null | undefined) {
  if (!deadline) {
    return "No due date set";
  }

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) {
    return "No due date set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(parsed);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTaskUrl(taskId: number, appBaseUrl?: string) {
  if (!appBaseUrl) {
    return null;
  }

  return `${appBaseUrl}/tasks?task=${taskId}&open=1`;
}

function buildPlainTextEmail({
  actorName,
  recipientName,
  taskTitle,
  description,
  deadlineLabel,
  priorityLabel,
  statusLabel,
  taskUrl,
}: {
  actorName: string;
  recipientName: string;
  taskTitle: string;
  description: string;
  deadlineLabel: string;
  priorityLabel: string;
  statusLabel: string;
  taskUrl: string | null;
}) {
  const lines = [
    `Hello ${recipientName},`,
    "",
    `${actorName} assigned you a task in TTCS.`,
    "",
    `Task: ${taskTitle}`,
    `Status: ${statusLabel}`,
    `Priority: ${priorityLabel}`,
    `Due: ${deadlineLabel}`,
  ];

  if (description) {
    lines.push("", "Description:", description);
  }

  if (taskUrl) {
    lines.push("", `Open task: ${taskUrl}`);
  }

  lines.push("", "Please review it in TTCS.");
  return lines.join("\n");
}

function buildHtmlEmail({
  actorName,
  recipientName,
  taskTitle,
  description,
  deadlineLabel,
  priorityLabel,
  statusLabel,
  taskUrl,
}: {
  actorName: string;
  recipientName: string;
  taskTitle: string;
  description: string;
  deadlineLabel: string;
  priorityLabel: string;
  statusLabel: string;
  taskUrl: string | null;
}) {
  const safeRecipientName = escapeHtml(recipientName);
  const safeActorName = escapeHtml(actorName);
  const safeTaskTitle = escapeHtml(taskTitle);
  const safeDescription = escapeHtml(description).replace(/\n/g, "<br />");
  const safeDeadline = escapeHtml(deadlineLabel);
  const safePriority = escapeHtml(priorityLabel);
  const safeStatus = escapeHtml(statusLabel);
  const safeTaskUrl = taskUrl ? escapeHtml(taskUrl) : null;

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px;color:#132238;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d9e1ec;border-radius:16px;padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;">Hello ${safeRecipientName},</p>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">
          <strong>${safeActorName}</strong> assigned you a task in TTCS.
        </p>
        <div style="border:1px solid #d9e1ec;border-radius:12px;padding:20px;background:#f9fbff;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#0f2b46;">${safeTaskTitle}</h2>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Status:</strong> ${safeStatus}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Priority:</strong> ${safePriority}</p>
          <p style="margin:0 0 ${description ? "16" : "0"}px;font-size:14px;"><strong>Due:</strong> ${safeDeadline}</p>
          ${
            description
              ? `<p style="margin:0;font-size:14px;line-height:1.7;"><strong>Description:</strong><br />${safeDescription}</p>`
              : ""
          }
        </div>
        ${
          safeTaskUrl
            ? `<p style="margin:24px 0 0;">
                <a href="${safeTaskUrl}" style="display:inline-block;background:#0f5cc0;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
                  Open task
                </a>
              </p>`
            : ""
        }
      </div>
    </div>
  `.trim();
}

export async function sendTaskAssignmentEmail({
  recipient,
  actorName,
  taskId,
  taskTitle,
  description,
  deadline,
  priority,
  status,
}: TaskAssignmentEmailInput) {
  const config = getEmailConfig();
  const recipientEmail = normalizeEmailAddress(recipient.email);

  if (!config || !recipientEmail) {
    return;
  }

  const taskUrl = buildTaskUrl(taskId, config.appBaseUrl);
  const deadlineLabel = formatDeadlineLabel(deadline);
  const priorityLabel = formatPriorityLabel(priority);
  const statusLabel = formatStatusLabel(status);
  const recipientName = recipient.fullName.trim() || "TTCS User";
  const taskDescription = description?.trim() ?? "";

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [recipientEmail],
        reply_to: config.replyTo ? [config.replyTo] : undefined,
        subject: `Task assigned: ${taskTitle}`,
        text: buildPlainTextEmail({
          actorName,
          recipientName,
          taskTitle,
          description: taskDescription,
          deadlineLabel,
          priorityLabel,
          statusLabel,
          taskUrl,
        }),
        html: buildHtmlEmail({
          actorName,
          recipientName,
          taskTitle,
          description: taskDescription,
          deadlineLabel,
          priorityLabel,
          statusLabel,
          taskUrl,
        }),
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("Task assignment email failed.", {
        status: response.status,
        recipientEmail,
        details,
      });
    }
  } catch (error) {
    console.error("Task assignment email request failed.", {
      recipientEmail,
      error: error instanceof Error ? error.message : error,
    });
  }
}
