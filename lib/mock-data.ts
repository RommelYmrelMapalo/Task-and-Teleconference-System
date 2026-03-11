export const inboxItems = [
  {
    id: 1,
    subject: "Meeting schedule updated",
    sender: "System",
    preview: "Your assigned meeting room was moved to AVR 2.",
    time: "8:30 AM",
    unread: true,
  },
  {
    id: 2,
    subject: "Task deadline reminder",
    sender: "Admin",
    preview: "Prepare the sprint dashboard handoff notes before 6:00 PM.",
    time: "Yesterday",
    unread: false,
  },
];

export const userTasks = [
  { id: 1, title: "Prepare testing handoff notes", due: "Due 9:00 AM", status: "Completed" },
  { id: 2, title: "Review faculty approval comments", due: "Due 6:30 PM", status: "Delayed" },
  { id: 3, title: "Capstone documentation cleanup", due: "Due 5:00 PM", status: "In Progress" },
];

export type TaskDashboardItem = {
  id: number;
  title: string;
  description: string;
  status: "in_progress" | "for_revision" | "completed" | "delayed";
  priority: "low" | "normal" | "high";
  dueLabel: string;
  createdLabel: string;
  activityLabel: string;
};

export const taskDashboardItems: TaskDashboardItem[] = [
  {
    id: 1,
    title: "Prepare testing handoff notes",
    description: "Finalize the QA summary and handoff packet for the dashboard migration.",
    status: "completed",
    priority: "low",
    dueLabel: "Mar 11, 2026 09:00 AM",
    createdLabel: "Mar 05, 2026 09:26 PM",
    activityLabel: "Mar 05, 2026 09:35 PM",
  },
  {
    id: 2,
    title: "Review faculty approval comments",
    description: "Address the remarks from faculty review and note required revisions.",
    status: "delayed",
    priority: "normal",
    dueLabel: "Mar 05, 2026 09:40 PM",
    createdLabel: "Mar 05, 2026 09:20 PM",
    activityLabel: "Mar 05, 2026 09:35 PM",
  },
  {
    id: 3,
    title: "Finalize sprint dashboard conversion",
    description: "Clean up layout regressions and confirm user shell consistency.",
    status: "in_progress",
    priority: "low",
    dueLabel: "Mar 11, 2026 11:00 AM",
    createdLabel: "Mar 05, 2026 09:26 PM",
    activityLabel: "Mar 05, 2026 09:26 PM",
  },
  {
    id: 4,
    title: "Capstone documentation cleanup",
    description: "Update the meeting references and attach the latest revision files.",
    status: "for_revision",
    priority: "low",
    dueLabel: "Mar 12, 2026 03:00 PM",
    createdLabel: "Mar 05, 2026 08:41 PM",
    activityLabel: "Mar 05, 2026 05:41 PM",
  },
];

export const meetings = [
  { id: 1, title: "Capstone checkpoint", room: "Room 402", time: "1:00 PM - 2:00 PM" },
  { id: 2, title: "Project briefing", room: "AVR 1", time: "3:30 PM - 4:30 PM" },
];

export const adminStats = [
  { label: "Total Tasks", value: "132" },
  { label: "Completed Tasks", value: "87" },
  { label: "Pending Tasks", value: "45" },
  { label: "Active Users", value: "58" },
];

export const adminUsers = [
  { id: 1, name: "Juan Student", email: "juan@student.edu", role: "User", status: "Active" },
  { id: 2, name: "Maria Cruz", email: "maria@student.edu", role: "User", status: "Active" },
  { id: 3, name: "Admin One", email: "admin@ttcs.local", role: "Admin", status: "Active" },
];
