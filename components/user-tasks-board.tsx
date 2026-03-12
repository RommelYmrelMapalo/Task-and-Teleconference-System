"use client";

import {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TaskAttachment, TaskItem } from "@/lib/ttcs-data";
import { applyTaskStatus, toggleTaskCompletion } from "@/lib/task-cache";

type TaskFilter = "all" | "active" | "revision" | "completed" | "delayed";
type EditableTask = TaskItem;
type EditableAttachment = TaskAttachment & { localFile?: File | null };

function generateAttachmentId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatAttachmentSize(size: number | null) {
  if (size === null || Number.isNaN(size) || size < 0) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentMetaParts(attachment: EditableAttachment) {
  return [formatAttachmentSize(attachment.size)].filter((value): value is string => Boolean(value));
}

function buildAttachmentsFromFiles(files: FileList) {
  const createdAt = new Date().toISOString();
  return Array.from(files).map((file) => ({
    id: `local-${generateAttachmentId()}`,
    filename: file.name,
    mimetype: file.type || null,
    storagePath: `local://${file.name}`,
    createdAt,
    size: file.size,
    downloadUrl: URL.createObjectURL(file),
    localFile: file,
  }));
}

function matchesFilter(task: EditableTask, filter: TaskFilter) {
  if (filter === "all") return true;
  if (filter === "active") return task.status === "assigned" || task.status === "in_progress";
  if (filter === "revision") return task.status === "for_revision";
  if (filter === "completed") return task.status === "completed";
  return task.isDelayed;
}

function statusLabel(task: EditableTask) {
  if (task.status === "completed") return "COMPLETED";
  if (task.isDelayed) return "DELAYED";
  if (task.status === "for_revision") return "FOR REVISION";
  if (task.status === "assigned") return "ASSIGNED";
  return "IN PROGRESS";
}

function statusClass(task: EditableTask) {
  if (task.status === "completed") return "st-completed";
  if (task.isDelayed) return "st-delayed";
  if (task.status === "for_revision") return "st-revision";
  return "st-pending";
}

function toInputDateTime(deadline: string | null) {
  if (!deadline) {
    return { dueDate: "", dueTime: "" };
  }

  const date = new Date(deadline);
  return {
    dueDate: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`,
    dueTime: `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`,
  };
}

function markSelectOpen(
  event:
    | PointerEvent<HTMLSelectElement>
    | FocusEvent<HTMLSelectElement>
    | KeyboardEvent<HTMLSelectElement>,
) {
  event.currentTarget.dataset.open = "true";
  event.currentTarget.parentElement?.setAttribute("data-open", "true");
}

function clearSelectOpen(event: ChangeEvent<HTMLSelectElement> | FocusEvent<HTMLSelectElement>) {
  delete event.currentTarget.dataset.open;
  event.currentTarget.parentElement?.removeAttribute("data-open");
}

function handleSelectKeyDown(event: KeyboardEvent<HTMLSelectElement>) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
    markSelectOpen(event);
    return;
  }

  if (event.key === "Escape" || event.key === "Tab") {
    delete event.currentTarget.dataset.open;
    event.currentTarget.parentElement?.removeAttribute("data-open");
  }
}

function SelectChevron() {
  return <span className="select-arrow" aria-hidden="true" />;
}

function attachmentStatusLabel(count: number, busy: boolean) {
  if (busy) {
    return "Adding attachments...";
  }

  if (count === 0) {
    return "No files selected yet";
  }

  if (count === 1) {
    return "1 file selected";
  }

  return `${count} files selected`;
}

function AttachmentList({
  attachments,
  onRemove,
  taskId,
}: {
  attachments: EditableAttachment[];
  onRemove?: (attachmentId: string) => void;
  taskId?: number;
}) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="attachment-list" role="list">
      {attachments.map((attachment) => (
        <div className="attachment-chip" key={attachment.id} role="listitem">
          <div className="attachment-copy">
            <span className={`attachment-name${attachment.downloadUrl ? "" : " attachment-name-static"}`}>
              {attachment.filename}
            </span>
            <span className="attachment-meta">{getAttachmentMetaParts(attachment).join(" | ")}</span>
          </div>
          {onRemove ? (
            <button type="button" className="attachment-remove" onClick={() => onRemove(attachment.id)}>
              Remove
            </button>
          ) : attachment.downloadUrl ? (
            <div className="attachment-actions">
              <a
                className="attachment-action"
                href={attachment.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
              <a
                className="attachment-action attachment-action-download"
                href={taskId ? `/api/tasks/${taskId}?attachmentId=${attachment.id}` : attachment.downloadUrl}
                rel="noreferrer"
              >
                Download
              </a>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function UserTasksBoard({
  tasks,
  viewerId,
  viewerCanManageAll = false,
}: {
  tasks: TaskItem[];
  viewerId: string;
  viewerCanManageAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [taskList, setTaskList] = useState<EditableTask[]>(tasks);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "normal" | "low">("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EditableTask | null>(null);
  const [editingTask, setEditingTask] = useState<EditableTask | null>(null);
  const [pendingEditWarningTask, setPendingEditWarningTask] = useState<EditableTask | null>(null);
  const [pendingToggleWarningTask, setPendingToggleWarningTask] = useState<EditableTask | null>(null);
  const [createAttachments, setCreateAttachments] = useState<EditableAttachment[]>([]);
  const [createAttachmentsBusy, setCreateAttachmentsBusy] = useState(false);
  const [createAttachmentError, setCreateAttachmentError] = useState<string | null>(null);
  const [editAttachments, setEditAttachments] = useState<EditableAttachment[]>([]);
  const [editAttachmentsBusy, setEditAttachmentsBusy] = useState(false);
  const [editAttachmentError, setEditAttachmentError] = useState<string | null>(null);
  const [createSubmitBusy, setCreateSubmitBusy] = useState(false);
  const [editSubmitBusy, setEditSubmitBusy] = useState(false);
  const [createSubmitError, setCreateSubmitError] = useState<string | null>(null);
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);
  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<number | null>(null);
  const handledTaskTargetRef = useRef<string | null>(null);
  const createAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const editAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTaskList(tasks);
  }, [tasks]);

  useEffect(() => {
    if (!taskModalOpen) return;
    const timeout = window.setTimeout(() => setTaskModalOpen(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [taskModalOpen]);

  useEffect(() => {
    if (highlightedTaskId === null) {
      return;
    }

    const timeout = window.setTimeout(() => setHighlightedTaskId(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [highlightedTaskId]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (drawerOpen) {
      root.dataset.taskDrawerOpen = "true";
      body.classList.add("task-drawer-open");
      return () => {
        delete root.dataset.taskDrawerOpen;
        body.classList.remove("task-drawer-open");
      };
    }

    delete root.dataset.taskDrawerOpen;
    body.classList.remove("task-drawer-open");
    return undefined;
  }, [drawerOpen]);

  useEffect(() => {
    if (!editingTask) {
      setEditAttachments([]);
      setEditAttachmentError(null);
      setEditAttachmentsBusy(false);
      return;
    }

    setEditAttachments(editingTask.attachments ?? []);
    setEditAttachmentError(null);
    setEditSubmitError(null);
  }, [editingTask]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId) {
      handledTaskTargetRef.current = null;
      return;
    }

    const targetId = Number(taskId);
    if (!Number.isFinite(targetId)) {
      return;
    }

    const targetKey = `${taskId}:${searchParams.get("open") ?? "0"}`;
    if (handledTaskTargetRef.current === targetKey) {
      return;
    }

    const targetTask = taskList.find((task) => task.id === targetId);
    if (!targetTask) {
      return;
    }

    handledTaskTargetRef.current = targetKey;
    startTransition(() => {
      setActiveFilter("all");
      setPriorityFilter("all");
      setSearch("");
      setHighlightedTaskId(targetId);
    });

    window.setTimeout(() => {
      const element = document.getElementById(`task-${targetId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });

      if (searchParams.get("open") === "1") {
        window.setTimeout(() => setSelectedTask(targetTask), 280);
      }
    }, 60);

    router.replace(pathname, { scroll: false });
  }, [pathname, router, searchParams, taskList]);

  const counts = useMemo(
    () => ({
      all: taskList.length,
      active: taskList.filter((task) => task.status === "assigned" || task.status === "in_progress").length,
      revision: taskList.filter((task) => task.status === "for_revision").length,
      completed: taskList.filter((task) => task.status === "completed").length,
      delayed: taskList.filter((task) => task.isDelayed).length,
    }),
    [taskList],
  );

  const visibleItems = useMemo(() => {
    return taskList.filter((task) => {
      const query = `${task.title} ${task.description}`.toLowerCase();
      const okSearch = !search.trim() || query.includes(search.trim().toLowerCase());
      const okPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const okFilter = matchesFilter(task, activeFilter);
      return okSearch && okPriority && okFilter;
    });
  }, [activeFilter, priorityFilter, search, taskList]);

  const recentItems = taskList.slice(0, 3);
  const canModifyTask = (task: EditableTask) =>
    viewerCanManageAll || task.assignees.some((assignee) => assignee.id === viewerId);
  const canToggleTaskWithoutWarning = (task: EditableTask) => canModifyTask(task);
  const canToggleTask = (task: EditableTask) => Boolean(task);
  const requestEditTask = (task: EditableTask) => {
    if (canModifyTask(task)) {
      setEditingTask(task);
      setSelectedTask(null);
      setPendingEditWarningTask(null);
      return;
    }

    setPendingEditWarningTask(task);
  };
  const requestToggleTask = (task: EditableTask) => {
    if (canToggleTaskWithoutWarning(task)) {
      void toggleTask(task.id);
      return;
    }

    setPendingToggleWarningTask(task);
  };

  const buildTaskPayload = (source: FormData, attachments: EditableAttachment[]) => {
    const payload = new FormData();
    const fields = ["title", "description", "status", "priority", "dueDate", "dueTime"];

    for (const field of fields) {
      const value = source.get(field);
      if (typeof value === "string") {
        payload.set(field, value);
      }
    }

    for (const attachment of attachments) {
      if (attachment.localFile) {
        payload.append("attachments", attachment.localFile);
        continue;
      }

      payload.append("keepAttachmentIds", attachment.id);
    }

    return payload;
  };

  const submitTaskRequest = async (input: RequestInfo | URL, init: RequestInit) => {
    const response = await fetch(input, init);
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(result?.error || "Task request failed.");
    }
  };

  const toggleTask = async (taskId: number) => {
    if (toggleBusyId === taskId) {
      return;
    }

    setToggleBusyId(taskId);
    const nextTaskList = toggleTaskCompletion(taskList, taskId);
    setTaskList(nextTaskList);
    if (selectedTask?.id === taskId) {
      setSelectedTask(nextTaskList.find((task) => task.id === taskId) ?? null);
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/toggle`, { method: "POST" });
      const result = (await response.json().catch(() => null)) as { error?: string; status?: TaskItem["status"] } | null;

      if (!response.ok || !result?.status) {
        throw new Error(result?.error || "Could not update task status.");
      }

      const syncedTaskList = applyTaskStatus(nextTaskList, taskId, result.status);
      setTaskList(syncedTaskList);
      if (selectedTask?.id === taskId) {
        setSelectedTask(syncedTaskList.find((task) => task.id === taskId) ?? null);
      }
      router.refresh();
    } catch {
      router.refresh();
    } finally {
      setToggleBusyId(null);
    }
  };

  const addCreateFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const { files } = input;
    if (!files?.length) {
      return;
    }

    setCreateAttachmentError(null);
    setCreateSubmitError(null);
    setCreateAttachmentsBusy(true);

    try {
      const nextAttachments = buildAttachmentsFromFiles(files);
      setCreateAttachments((current) => [...current, ...nextAttachments]);
    } catch {
      setCreateAttachmentError("Could not add one or more attachments.");
    } finally {
      setCreateAttachmentsBusy(false);
      input.value = "";
    }
  };

  const addEditFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const { files } = input;
    if (!files?.length) {
      return;
    }

    setEditAttachmentError(null);
    setEditSubmitError(null);
    setEditAttachmentsBusy(true);

    try {
      const nextAttachments = buildAttachmentsFromFiles(files);
      setEditAttachments((current) => [...current, ...nextAttachments]);
    } catch {
      setEditAttachmentError("Could not add one or more attachments.");
    } finally {
      setEditAttachmentsBusy(false);
      input.value = "";
    }
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createAttachmentsBusy || createSubmitBusy) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    if (!title) return;

    setCreateSubmitBusy(true);
    setCreateSubmitError(null);

    try {
      await submitTaskRequest("/api/tasks", {
        method: "POST",
        body: buildTaskPayload(formData, createAttachments),
      });
      setDrawerOpen(false);
      setTaskModalOpen(true);
      form.reset();
      setCreateAttachments([]);
      setCreateAttachmentError(null);
      router.refresh();
    } catch (error) {
      setCreateSubmitError(error instanceof Error ? error.message : "Could not save the task.");
    } finally {
      setCreateSubmitBusy(false);
    }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTask || editAttachmentsBusy || editSubmitBusy) return;

    const formData = new FormData(event.currentTarget);
    setEditSubmitBusy(true);
    setEditSubmitError(null);

    try {
      await submitTaskRequest(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        body: buildTaskPayload(formData, editAttachments),
      });
      setEditingTask(null);
      setSelectedTask(null);
      router.refresh();
    } catch (error) {
      setEditSubmitError(error instanceof Error ? error.message : "Could not update the task.");
    } finally {
      setEditSubmitBusy(false);
    }
  };

  return (
    <div className="taskdash-wrap">
      {taskModalOpen ? (
        <div className="modal-overlay show autoModal">
          <div className="modal-popup success modern-popup" role="status" aria-live="polite">
            <div className="modal-icon-wrap">
              <div className="modal-icon" aria-hidden="true">
                {"\u2713"}
              </div>
            </div>
            <div className="modal-text">Task created!</div>
            <div className="modal-subtext">The task has been added back into your current dashboard view.</div>
            <div className="modal-progress" aria-hidden="true" />
          </div>
        </div>
      ) : null}

      {selectedTask ? (
        <div className="modal-overlay show" onClick={() => setSelectedTask(null)}>
          <div className="modal-popup modern-popup task-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-text">Task Details</div>
            <div className="form-stack task-detail-body">
              <div className="drawer-field task-detail-section-center">
                <div className="drawer-label">TITLE</div>
                <div className="field-input task-detail-value">{selectedTask.title}</div>
              </div>
              <div className="drawer-field task-detail-section-center">
                <div className="drawer-label">DESCRIPTION</div>
                <div className="drawer-textarea task-detail-value task-detail-description">{selectedTask.description}</div>
              </div>
              <div className="drawer-grid3 two-up task-detail-grid">
                <div className="drawer-field task-detail-section-center">
                  <div className="drawer-label">STATUS</div>
                  <div className="field-input task-detail-value">{statusLabel(selectedTask)}</div>
                </div>
                <div className="drawer-field task-detail-section-center">
                  <div className="drawer-label">PRIORITY</div>
                  <div className="field-input task-detail-value">{selectedTask.priority.toUpperCase()}</div>
                </div>
              </div>
              <div className="drawer-field task-detail-section-center">
                <div className="drawer-label">DEADLINE</div>
                <div className="field-input task-detail-value">{selectedTask.dueLabel}</div>
              </div>
              {selectedTask.attachments.length ? (
                <div className="drawer-field task-detail-attachments task-detail-section-center">
                  <div className="drawer-label">ATTACHMENTS</div>
                  <AttachmentList attachments={selectedTask.attachments} taskId={selectedTask.id} />
                </div>
              ) : null}
              <div className="task-detail-actions">
                <button type="button" className="btn-mini task-detail-edit" onClick={() => requestEditTask(selectedTask)}>
                  Edit
                </button>
                <button type="button" className="primary-btn task-detail-close" onClick={() => setSelectedTask(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingEditWarningTask ? (
        <div className="modal-overlay show" onClick={() => setPendingEditWarningTask(null)}>
          <div className="modal-popup modern-popup warning-popup" onClick={(event) => event.stopPropagation()}>
            <div className="modal-icon-wrap">
              <div className="modal-icon" aria-hidden="true">
                !
              </div>
            </div>
            <div className="modal-text">This task is not assigned to you. Continue?</div>
            <div className="modal-subtext">
              If you continue, you can edit the task and the change will be logged in the admin reports page.
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-mini" onClick={() => setPendingEditWarningTask(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setEditingTask(pendingEditWarningTask);
                  setSelectedTask(null);
                  setPendingEditWarningTask(null);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingToggleWarningTask ? (
        <div className="modal-overlay show" onClick={() => setPendingToggleWarningTask(null)}>
          <div className="modal-popup modern-popup warning-popup" onClick={(event) => event.stopPropagation()}>
            <div className="modal-icon-wrap">
              <div className="modal-icon" aria-hidden="true">
                !
              </div>
            </div>
            <div className="modal-text">
              {pendingToggleWarningTask.status === "completed"
                ? "This task is not assigned to you, unmark as complete?"
                : "This task is not assigned to you, mark as complete?"}
            </div>
            <div className="modal-subtext">
              {pendingToggleWarningTask.status === "completed"
                ? "If you continue, the task will be restored and the override will be logged in the admin reports page."
                : "If you continue, the task will be marked complete and the override will be logged in the admin reports page."}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-mini" onClick={() => setPendingToggleWarningTask(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  const task = pendingToggleWarningTask;
                  setPendingToggleWarningTask(null);
                  if (task) {
                    void toggleTask(task.id);
                  }
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingTask ? (
        <div className="modal-overlay show" onClick={() => setEditingTask(null)}>
          <div className="modal-popup modern-popup task-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-text">Edit Task</div>
            <form className="form-stack task-edit-form" onSubmit={saveEdit}>
              {(() => {
                const inputs = toInputDateTime(editingTask.deadline);
                return (
                  <>
                    <div className="drawer-field">
                      <div className="drawer-label">TITLE</div>
                      <input className="field-input" name="title" defaultValue={editingTask.title} />
                    </div>
                    <div className="drawer-field">
                      <div className="drawer-label">DESCRIPTION</div>
                      <textarea className="drawer-textarea" name="description" defaultValue={editingTask.description} rows={4} />
                    </div>
                    <div className="drawer-grid3 two-up task-detail-grid">
                      <div className="drawer-field">
                        <div className="drawer-label">STATUS</div>
                        <div className="select-shell">
                          <select
                            className="field-input field-select"
                            name="status"
                            defaultValue={editingTask.status}
                            onPointerDown={markSelectOpen}
                            onFocus={markSelectOpen}
                            onBlur={clearSelectOpen}
                            onChange={clearSelectOpen}
                            onKeyDown={handleSelectKeyDown}
                          >
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="for_revision">For Revision</option>
                            <option value="completed">Completed</option>
                          </select>
                          <SelectChevron />
                        </div>
                      </div>
                      <div className="drawer-field">
                        <div className="drawer-label">PRIORITY</div>
                        <div className="select-shell">
                          <select
                            className="field-input field-select"
                            name="priority"
                            defaultValue={editingTask.priority}
                            onPointerDown={markSelectOpen}
                            onFocus={markSelectOpen}
                            onBlur={clearSelectOpen}
                            onChange={clearSelectOpen}
                            onKeyDown={handleSelectKeyDown}
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                          </select>
                          <SelectChevron />
                        </div>
                      </div>
                    </div>
                    <div className="drawer-grid3 two-up task-detail-grid">
                      <div className="drawer-field">
                        <div className="drawer-label">DUE DATE</div>
                        <input className="field-input" type="date" name="dueDate" defaultValue={inputs.dueDate} />
                      </div>
                      <div className="drawer-field">
                        <div className="drawer-label">DUE TIME</div>
                        <input className="field-input" type="time" name="dueTime" defaultValue={inputs.dueTime} />
                      </div>
                    </div>
                    <div className="drawer-field task-attachment-field">
                      <div className="drawer-label">ATTACHMENTS</div>
                      <div className="attachment-picker">
                        <div className="attachment-picker-copy">
                          <span className="attachment-picker-title">Add or replace files</span>
                          <span className="attachment-picker-subtitle">Select multiple files. Remove any file before saving.</span>
                        </div>
                        <div className="attachment-picker-actions">
                          <button
                            type="button"
                            className="attachment-picker-button"
                            onClick={() => editAttachmentInputRef.current?.click()}
                            disabled={editAttachmentsBusy || editSubmitBusy}
                          >
                            Choose files
                          </button>
                          <span className="attachment-picker-status">
                            {attachmentStatusLabel(editAttachments.length, editAttachmentsBusy)}
                          </span>
                        </div>
                        <input
                          id="edit-task-attachments"
                          ref={editAttachmentInputRef}
                          className="attachment-input"
                          type="file"
                          multiple
                          onChange={addEditFiles}
                        />
                      </div>
                      {editAttachmentError ? <div className="attachment-note attachment-error">{editAttachmentError}</div> : null}
                      {editSubmitError ? <div className="attachment-note attachment-error">{editSubmitError}</div> : null}
                      <AttachmentList
                        attachments={editAttachments}
                        onRemove={(attachmentId) =>
                          setEditAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
                        }
                      />
                    </div>
                    <div className="drawer-footer">
                      <button type="button" className="btn-mini drawer-cancel" onClick={() => setEditingTask(null)}>
                        Cancel
                      </button>
                      <button type="submit" className="primary-btn drawer-publish" disabled={editAttachmentsBusy || editSubmitBusy}>
                        {editSubmitBusy ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      ) : null}

      <div className="td-pills">
        {([
          ["all", "All Tasks"],
          ["active", "Active"],
          ["revision", "For Revision"],
          ["completed", "Completed"],
          ["delayed", "Delayed"],
        ] as Array<[TaskFilter, string]>).map(([key, label]) => (
          <button
            key={key}
            className={`pill-tab${activeFilter === key ? " active" : ""}`}
            type="button"
            onClick={() => setActiveFilter(key)}
          >
            {label}
            <span className="pill-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="td-toolbar taskdash-toolbar">
        <div className="select-shell td-filter">
          <select
            className="field-input field-select"
            value={priorityFilter}
            onChange={(event) => {
              clearSelectOpen(event);
              setPriorityFilter(event.target.value as "all" | "high" | "normal" | "low");
            }}
            onPointerDown={markSelectOpen}
            onFocus={markSelectOpen}
            onBlur={clearSelectOpen}
            onKeyDown={handleSelectKeyDown}
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <SelectChevron />
        </div>
        <input
          className="field-input td-search"
          placeholder="Search tasks..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="scroll">
        <div className="recent-wrap">
          <div className="recent-title">Recently created/edited tasks</div>
          {recentItems.length ? (
            <div className="recent-list">
              {recentItems.map((item) => (
                <article
                  className="recent-item"
                  key={item.id}
                  onClick={() => setSelectedTask(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedTask(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="recent-main">
                      <span className={`recent-action ${statusClass(item).replace("st-", "")}`}>{statusLabel(item)}</span>
                      <div className="recent-text">
                        <span className="recent-task-name">{item.title}</span>
                        <div className="recent-meta">
                          <span>Created: {item.createdLabel}</span>
                          <span>Priority: {item.priority.toUpperCase()}</span>
                          <span className={`recent-deadline${item.isDelayed ? " delayed" : ""}`}>Deadline: {item.dueLabel}</span>
                        </div>
                      </div>
                  </div>
                  <div className="recent-side">
                    <span className="recent-time">Last edited by: {item.lastEditedByLabel} at {item.activityLabel}</span>
                    <span className="recent-time">Created by: {item.createdByLabel} at {item.createdLabel}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="recent-time">No recent task activity yet.</div>
          )}
        </div>

        <div className="table-shell">
          {visibleItems.length ? (
            visibleItems.map((task) => (
              <article
                className={`task-row task-item${task.status === "completed" ? " is-completed" : ""}${highlightedTaskId === task.id ? " is-highlighted" : ""}`}
                id={`task-${task.id}`}
                key={task.id}
              >
                <div className="task-left">
                  <button
                    type="button"
                    className={`task-check${task.status === "completed" ? " is-done" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      requestToggleTask(task);
                    }}
                    disabled={!canToggleTask(task)}
                    aria-label={
                      canToggleTaskWithoutWarning(task)
                        ? task.status === "completed"
                          ? `Restore ${task.title} to previous status`
                          : `Mark ${task.title} complete`
                        : task.status === "completed"
                          ? "This task is not assigned to you, unmark as complete?"
                          : "This task is not assigned to you, mark as complete?"
                    }
                    title={
                      canToggleTaskWithoutWarning(task)
                        ? undefined
                        : task.status === "completed"
                          ? "This task is not assigned to you, unmark as complete?"
                          : "This task is not assigned to you, mark as complete?"
                    }
                  >
                    {"\u2713"}
                  </button>

                  <div className="task-info">
                    <button type="button" className="task-title-link" onClick={() => setSelectedTask(task)}>
                      {task.title}
                    </button>
                    <div className="task-meta">{task.description}</div>
                  </div>

                  <div className="task-tags">
                    <span className={`status ${statusClass(task)}`}>{statusLabel(task)}</span>
                    <span className={`prio prio-${task.priority}`}>{task.priority.toUpperCase()}</span>
                  </div>
                </div>

                <div className="task-right">
                  <div className="task-actions">
                    <button
                      type="button"
                      className="btn-mini"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedTask(task);
                      }}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn-mini ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        requestEditTask(task);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="task-empty">No tasks found.</div>
          )}
        </div>
      </div>

      <button type="button" className={`fab-task${drawerOpen ? " fab-hidden" : ""}`} onClick={() => setDrawerOpen(true)}>
        <span className="fab-plus">+</span>
      </button>

      <div className={`drawer-backdrop${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />

      <aside className={`task-drawer${drawerOpen ? " open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div>
            <div className="drawer-title">New Task</div>
            <div className="drawer-sub">Create a task card from the dashboard again</div>
          </div>
          <button type="button" className="drawer-x drawer-x-danger" onClick={() => setDrawerOpen(false)}>
            {"\u00D7"}
          </button>
        </div>

        <form className="drawer-body" onSubmit={createTask}>
          <div className="drawer-field">
            <div className="drawer-label">TITLE</div>
            <input className="drawer-input" name="title" placeholder="Task title..." />
          </div>

          <div className="drawer-grid3 two-up">
            <div className="drawer-field">
              <div className="drawer-label">STATUS</div>
              <div className="select-shell">
                <select
                  className="drawer-input"
                  name="status"
                  defaultValue="assigned"
                  onPointerDown={markSelectOpen}
                  onFocus={markSelectOpen}
                  onBlur={clearSelectOpen}
                  onChange={clearSelectOpen}
                  onKeyDown={handleSelectKeyDown}
                >
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="for_revision">For Revision</option>
                  <option value="completed">Completed</option>
                </select>
                <SelectChevron />
              </div>
            </div>

            <div className="drawer-field">
              <div className="drawer-label">PRIORITY</div>
              <div className="select-shell">
                <select
                  className="drawer-input"
                  name="priority"
                  defaultValue="normal"
                  onPointerDown={markSelectOpen}
                  onFocus={markSelectOpen}
                  onBlur={clearSelectOpen}
                  onChange={clearSelectOpen}
                  onKeyDown={handleSelectKeyDown}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
                <SelectChevron />
              </div>
            </div>
          </div>

          <div className="drawer-grid3 two-up">
            <div className="drawer-field">
              <div className="drawer-label">DUE DATE</div>
              <input className="drawer-input" type="date" name="dueDate" />
            </div>
            <div className="drawer-field">
              <div className="drawer-label">DUE TIME</div>
              <input className="drawer-input" type="time" name="dueTime" />
            </div>
          </div>

          <div className="drawer-field">
            <div className="drawer-label">DESCRIPTION</div>
            <textarea className="drawer-textarea" name="description" rows={5} placeholder="Write details..." />
          </div>

          <div className="drawer-field task-attachment-field">
            <div className="drawer-label">ATTACHMENTS</div>
            <div className="attachment-picker">
              <div className="attachment-picker-copy">
                <span className="attachment-picker-title">Add attachments</span>
                <span className="attachment-picker-subtitle">Select multiple files, then remove any file before publishing.</span>
              </div>
              <div className="attachment-picker-actions">
                <button
                  type="button"
                  className="attachment-picker-button"
                  onClick={() => createAttachmentInputRef.current?.click()}
                  disabled={createAttachmentsBusy || createSubmitBusy}
                >
                  Choose files
                </button>
                <span className="attachment-picker-status">
                  {attachmentStatusLabel(createAttachments.length, createAttachmentsBusy)}
                </span>
              </div>
              <input
                id="new-task-attachments"
                ref={createAttachmentInputRef}
                className="attachment-input"
                type="file"
                multiple
                onChange={addCreateFiles}
              />
            </div>
            {createAttachmentError ? <div className="attachment-note attachment-error">{createAttachmentError}</div> : null}
            {createSubmitError ? <div className="attachment-note attachment-error">{createSubmitError}</div> : null}
            <AttachmentList
              attachments={createAttachments}
              onRemove={(attachmentId) =>
                setCreateAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
              }
            />
          </div>

          <div className="drawer-footer">
            <button type="button" className="btn-mini drawer-cancel" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="primary-btn drawer-publish" disabled={createAttachmentsBusy || createSubmitBusy}>
              {createSubmitBusy ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
