import type { TaskItem } from "@/lib/ttcs-data";

const TASK_CACHE_KEY = "ttcs_local_tasks";
const TASK_CACHE_EVENT = "ttcs-local-tasks-change";

function sortTasks(tasks: TaskItem[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = new Date(left.activityAt || left.createdAt).getTime();
    const rightTime = new Date(right.activityAt || right.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isTaskDelayed(deadline: string | null, status: TaskItem["status"]) {
  if (!deadline || status === "completed") {
    return false;
  }

  return new Date(deadline).getTime() < Date.now();
}

function normalizeCachedTask(task: TaskItem) {
  return {
    ...task,
    createdByLabel: task.createdByLabel || "Not tracked",
    lastEditedByLabel: task.lastEditedByLabel || "Unknown user",
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
  };
}

function toSerializableTask(task: TaskItem): TaskItem {
  return {
    ...task,
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
  };
}

export function getTaskCacheKey() {
  return TASK_CACHE_KEY;
}

export function getTaskCacheEvent() {
  return TASK_CACHE_EVENT;
}

export function readCachedTasks() {
  if (typeof window === "undefined") {
    return [] as TaskItem[];
  }

  const raw = window.localStorage.getItem(TASK_CACHE_KEY);
  if (!raw) {
    return [] as TaskItem[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TaskItem[]).map(normalizeCachedTask) : [];
  } catch {
    return [] as TaskItem[];
  }
}

export function mergeTaskCache(serverTasks: TaskItem[], cachedTasks: TaskItem[]) {
  const merged = new Map<number, TaskItem>();

  for (const task of serverTasks) {
    merged.set(task.id, normalizeCachedTask(task));
  }

  for (const task of cachedTasks) {
    merged.set(task.id, normalizeCachedTask(task));
  }

  return sortTasks(Array.from(merged.values()));
}

export function writeCachedTasks(tasks: TaskItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = sortTasks(tasks);
  const serializable = normalized.map(toSerializableTask);

  try {
    window.localStorage.setItem(TASK_CACHE_KEY, JSON.stringify(serializable));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      window.localStorage.removeItem(TASK_CACHE_KEY);
      return;
    }

    throw error;
  }

  window.dispatchEvent(new Event(TASK_CACHE_EVENT));
}

export function toggleTaskCompletion(tasks: TaskItem[], taskId: number) {
  const now = new Date().toISOString();

  return sortTasks(
    tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      if (task.status === "completed") {
        const restoredStatus = task.previousStatus ?? "in_progress";
        return {
          ...task,
          status: restoredStatus,
          previousStatus: restoredStatus,
          isDelayed: isTaskDelayed(task.deadline, restoredStatus),
          activityAt: now,
          activityLabel: formatDateTime(now),
        };
      }

      return {
        ...task,
        status: "completed",
        previousStatus: task.status,
        isDelayed: false,
        activityAt: now,
        activityLabel: formatDateTime(now),
      };
    }),
  );
}
