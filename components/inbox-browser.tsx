"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InboxThreadItem } from "@/lib/ttcs-data";

function createTemporaryMessageTime() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date());
}

function initialsFromName(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TT"
  );
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function deriveContactAlias(email: string) {
  return email
    .split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .trim() ?? "";
}

function formatForwardedMessageDate(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(createdAt));
}

function createForwardedMessageBody(
  message: InboxThreadItem["messages"][number],
  recipientLabel: string,
) {
  return [
    "---------- Forwarded message ---------",
    `From: ${message.senderLabel}`,
    `Date: ${formatForwardedMessageDate(message.createdAt)}`,
    `Subject: ${message.subject}`,
    `To: ${recipientLabel}`,
    "",
    message.body,
  ].join("\n");
}

export function InboxBrowser({
  items,
  emptyLabel,
  viewerLabel,
  contacts,
}: {
  items: InboxThreadItem[];
  emptyLabel: string;
  viewerLabel: string;
  contacts: Array<{
    id: string;
    email: string;
    fullName: string;
    roleLabel: string;
  }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "task" | "meeting" | "conversation" | "trash">("all");
  const [threads, setThreads] = useState(items);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipientId, setComposeRecipientId] = useState(contacts[0]?.id ?? "");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeBusy, setComposeBusy] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [trashBusy, setTrashBusy] = useState(false);
  const [trashError, setTrashError] = useState<string | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setThreads(items);
    setSelectedId((current) => {
      if (current && items.some((item) => item.id === current)) {
        return current;
      }

      return items[0]?.id ?? null;
    });
  }, [items]);

  useEffect(() => {
    setComposeRecipientId((current) => current || contacts[0]?.id || "");
  }, [contacts]);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return threads.filter((item) => {
      const matchesQuery =
        !trimmed ||
        `${item.subject} ${item.preview} ${item.counterpartLabel} ${item.counterpartMeta} ${item.messages
          .map((message) => message.body)
          .join(" ")}`
          .toLowerCase()
          .includes(trimmed);

      const matchesFilter =
        (activeFilter === "trash" && item.isTrashed) ||
        (!item.isTrashed &&
          (activeFilter === "all" ||
            (activeFilter === "task" && item.threadType === "task_notification") ||
            (activeFilter === "meeting" && item.threadType === "meeting") ||
            (activeFilter === "conversation" && item.threadType === "conversation")));

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, query, threads]);

  const selectedThread = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const unreadCount = threads.filter((thread) => !thread.isTrashed).reduce((count, thread) => count + thread.unreadCount, 0);
  const counts = useMemo(
    () => ({
      all: threads.filter((item) => !item.isTrashed).length,
      task: threads.filter((item) => !item.isTrashed && item.threadType === "task_notification").length,
      meeting: threads.filter((item) => !item.isTrashed && item.threadType === "meeting").length,
      conversation: threads.filter((item) => !item.isTrashed && item.threadType === "conversation").length,
      trash: threads.filter((item) => item.isTrashed).length,
    }),
    [threads],
  );
  const getReplyContactId = (thread: InboxThreadItem | null) => {
    if (!thread) {
      return null;
    }

    const preferredName = thread.threadType === "task_notification" ? thread.creatorLabel : thread.counterpartLabel;
    const normalizedPreferredName = normalizeName(preferredName);
    const matched = contacts.find((contact) => {
      const normalizedFullName = normalizeName(contact.fullName);
      const normalizedAlias = normalizeName(deriveContactAlias(contact.email));
      return normalizedFullName === normalizedPreferredName || normalizedAlias === normalizedPreferredName;
    });
    return matched?.id ?? null;
  };
  const selectedReplyContactId = getReplyContactId(selectedThread);
  const canReplyToSelectedThread = Boolean(
    selectedThread &&
      (selectedThread.canReply || selectedReplyContactId || selectedThread.threadType === "task_notification"),
  );
  const latestSelectedMessage = selectedThread ? selectedThread.messages[selectedThread.messages.length - 1] ?? null : null;
  const toolbarTotal = activeFilter === "trash" ? counts.trash : counts.all;
  const activeEmptyLabel = activeFilter === "trash" ? "Trash is empty." : emptyLabel;

  const markThreadReadLocally = (threadId: string) => {
    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              unreadCount: 0,
              messages: thread.messages.map((message) =>
                message.isOutgoing ? message : { ...message, isRead: true },
              ),
            }
          : thread,
      ),
    );
  };

  const openThread = (threadId: string) => {
    setSelectedId(threadId);
    setComposeOpen(false);
    setReplyOpen(false);
    setReplyError(null);
    setTrashError(null);

    const currentThread = threads.find((thread) => thread.id === threadId);
    if (!currentThread || currentThread.unreadCount === 0) {
      return;
    }

    markThreadReadLocally(threadId);

    startTransition(async () => {
      await fetch("/api/inbox/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ threadKey: threadId }),
      });
      router.refresh();
    });
  };

  const openReplyComposer = () => {
    if (!canReplyToSelectedThread || selectedThread?.isTrashed) {
      return;
    }

    setReplyError(null);
    setReplyOpen(true);
    window.setTimeout(() => {
      replyInputRef.current?.focus();
    }, 0);
  };

  const openForwardComposer = () => {
    if (!selectedThread || !latestSelectedMessage || selectedThread.isTrashed) {
      return;
    }

    setComposeRecipientId(contacts[0]?.id ?? "");
    setComposeSubject(`Fwd: ${selectedThread.subject}`);
    setComposeBody(createForwardedMessageBody(latestSelectedMessage, viewerLabel));
    setComposeError(null);
    setReplyOpen(false);
    setComposeOpen(true);
  };

  const submitTrashAction = async (action: "trash" | "restore") => {
    if (!selectedThread || trashBusy) {
      return;
    }

    setTrashBusy(true);
    setTrashError(null);

    try {
      const response = await fetch("/api/inbox/trash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadKey: selectedThread.id,
          action,
        }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || `Could not ${action} the conversation.`);
      }

      const now = new Date();
      const trashExpiresAt = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
      const trashExpiresLabel = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }).format(trashExpiresAt);

      setThreads((current) =>
        current.map((thread) =>
          thread.id === selectedThread.id
            ? {
                ...thread,
                isTrashed: action === "trash",
                trashExpiresAt: action === "trash" ? trashExpiresAt.toISOString() : null,
                trashExpiresLabel: action === "trash" ? trashExpiresLabel : null,
              }
            : thread,
        ),
      );
      setReplyOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setTrashError(error instanceof Error ? error.message : `Could not ${action} the conversation.`);
    } finally {
      setTrashBusy(false);
    }
  };

  const submitTrashActionForThread = async (threadId: string, action: "trash" | "restore") => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread || trashBusy) {
      return;
    }

    if (
      action === "trash" &&
      !window.confirm(`Move "${thread.subject}" to Trash? It will be permanently deleted after 31 days.`)
    ) {
      return;
    }

    setTrashBusy(true);
    setTrashError(null);

    try {
      const response = await fetch("/api/inbox/trash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadKey: thread.id,
          action,
        }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || `Could not ${action} the conversation.`);
      }

      const now = new Date();
      const trashExpiresAt = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
      const trashExpiresLabel = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }).format(trashExpiresAt);

      setThreads((current) =>
        current.map((item) =>
          item.id === thread.id
            ? {
                ...item,
                isTrashed: action === "trash",
                trashExpiresAt: action === "trash" ? trashExpiresAt.toISOString() : null,
                trashExpiresLabel: action === "trash" ? trashExpiresLabel : null,
              }
            : item,
        ),
      );

      if (selectedId === thread.id) {
        setReplyOpen(false);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setTrashError(error instanceof Error ? error.message : `Could not ${action} the conversation.`);
    } finally {
      setTrashBusy(false);
    }
  };

  const submitCompose = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const recipientUserId = composeRecipientId.trim();
    const subject = composeSubject.trim();
    const message = composeBody.trim();

    if (!recipientUserId) {
      setComposeError("Choose who should receive the message.");
      return;
    }

    if (!subject) {
      setComposeError("Message title is required.");
      return;
    }

    if (!message) {
      setComposeError("Write a message before sending.");
      return;
    }

    setComposeBusy(true);
    setComposeError(null);

    try {
      const response = await fetch("/api/inbox/compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientUserId,
          subject,
          message,
        }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string; thread?: { thread_key: string } } | null;
      if (!response.ok) {
        throw new Error(result?.error || "Could not send the message.");
      }

      const recipient = contacts.find((contact) => contact.id === recipientUserId);
      const nextThreadId = result?.thread?.thread_key ?? `direct:${Date.now()}`;
      const createdAt = new Date().toISOString();
      const timeLabel = createTemporaryMessageTime();

      setThreads((current) => [
        {
          id: nextThreadId,
          subject,
          preview: message,
          updatedAt: createdAt,
          timeLabel,
          unreadCount: 0,
          counterpartLabel: recipient?.fullName ?? "TTCS Member",
          counterpartMeta: recipient?.roleLabel ?? "Conversation",
          canReply: true,
          taskId: null,
          creatorLabel: viewerLabel,
          threadType: "conversation",
          messages: [
            {
              id: Date.now(),
              subject,
              body: message,
              createdAt,
              timeLabel,
              isRead: true,
              isOutgoing: true,
              senderLabel: viewerLabel,
              senderInitials: initialsFromName(viewerLabel),
            },
          ],
        },
        ...current,
      ]);
      setComposeSubject("");
      setComposeBody("");
      setComposeOpen(false);
      setSelectedId(nextThreadId);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : "Could not send the message.");
    } finally {
      setComposeBusy(false);
    }
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedThread || !canReplyToSelectedThread || replyBusy) {
      return;
    }

    const message = replyBody.trim();
    if (!message) {
      setReplyError("Write a message before sending.");
      return;
    }

    setReplyBusy(true);
    setReplyError(null);

    try {
      if (selectedThread.canReply || selectedThread.threadType === "task_notification") {
        const response = await fetch("/api/inbox/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            threadKey: selectedThread.id,
            message,
          }),
        });

        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(result?.error || "Could not send the reply.");
        }

        setThreads((current) =>
          current.map((thread) =>
            thread.id === selectedThread.id
              ? {
                  ...thread,
                  preview: message,
                  updatedAt: new Date().toISOString(),
                  timeLabel: createTemporaryMessageTime(),
                  canReply: true,
                  messages: [
                    ...thread.messages,
                    {
                      id: Date.now(),
                      subject: thread.subject,
                      body: message,
                      createdAt: new Date().toISOString(),
                      timeLabel: createTemporaryMessageTime(),
                      isRead: true,
                      isOutgoing: true,
                      senderLabel: viewerLabel,
                      senderInitials: initialsFromName(viewerLabel),
                    },
                  ],
                }
              : thread,
          ),
        );
      } else if (selectedReplyContactId) {
        const response = await fetch("/api/inbox/compose", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientUserId: selectedReplyContactId,
            subject: `Re: ${selectedThread.subject}`,
            message,
          }),
        });

        const result = (await response.json().catch(() => null)) as { error?: string; thread?: { thread_key: string } } | null;
        if (!response.ok) {
          throw new Error(result?.error || "Could not send the reply.");
        }

        const recipient = contacts.find((contact) => contact.id === selectedReplyContactId);
        const createdAt = new Date().toISOString();
        const timeLabel = createTemporaryMessageTime();
        const nextThreadId = result?.thread?.thread_key ?? `direct:${Date.now()}`;

        setThreads((current) => [
          {
            id: nextThreadId,
            subject: `Re: ${selectedThread.subject}`,
            preview: message,
            updatedAt: createdAt,
            timeLabel,
            unreadCount: 0,
            counterpartLabel: recipient?.fullName ?? selectedThread.creatorLabel,
            counterpartMeta: recipient?.roleLabel ?? "Conversation",
            canReply: true,
            taskId: selectedThread.taskId,
            creatorLabel: selectedThread.creatorLabel,
            threadType: "conversation",
            messages: [
              {
                id: Date.now(),
                subject: `Re: ${selectedThread.subject}`,
                body: message,
                createdAt,
                timeLabel,
                isRead: true,
                isOutgoing: true,
                senderLabel: viewerLabel,
                senderInitials: initialsFromName(viewerLabel),
              },
            ],
          },
          ...current,
        ]);
        setSelectedId(nextThreadId);
      }

      setReplyBody("");
      setReplyOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "Could not send the reply.");
    } finally {
      setReplyBusy(false);
    }
  };

  return (
    <div className="inbox-shell inbox-page">
      <div className="inbox-toolbar inbox-page-toolbar">
        <div className="inbox-toolbar-main">
          <button
            type="button"
            className="primary-btn inbox-compose-trigger"
            onClick={() => {
              setComposeRecipientId(contacts[0]?.id ?? "");
              setComposeSubject("");
              setComposeBody("");
              setReplyOpen(false);
              setComposeOpen(true);
              setComposeError(null);
            }}
            disabled={!contacts.length}
          >
            New message
          </button>
          <input
            className="inbox-search"
            placeholder="Search conversations..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="inbox-toolbar-status">
          <div className="inbox-toolbar-badge">
            Showing {filteredItems.length} of {toolbarTotal}
          </div>
          <div className="inbox-toolbar-badge">
            {unreadCount} unread{isPending ? " ..." : ""}
          </div>
        </div>
      </div>

      <div className="inbox-layout inbox-page-layout">
        <section className="inbox-list-panel inbox-page-list-panel">
          <div className="inbox-panel-head inbox-page-panel-head">
            <div className="inbox-panel-head-main">
              <h3>Inbox</h3>
            </div>
            <div className="inbox-panel-head-actions">
              <button
                type="button"
                className={`inbox-side-toggle${activeFilter !== "trash" ? " active" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                Inbox
              </button>
              <button
                type="button"
                className={`inbox-side-toggle${activeFilter === "trash" ? " active" : ""}`}
                onClick={() => setActiveFilter("trash")}
              >
                Trash
                <span className="inbox-side-toggle-count">{counts.trash}</span>
              </button>
            </div>
          </div>

          {activeFilter !== "trash" ? (
            <div className="td-pills inbox-filter-pills">
              {([
                ["all", "All"],
                ["task", "Task"],
                ["meeting", "Meeting"],
                ["conversation", "Chat"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`pill-tab${activeFilter === key ? " active" : ""}`}
                  onClick={() => setActiveFilter(key)}
                >
                  {label}
                  <span className="pill-count">{counts[key]}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="inbox-list inbox-page-list">
            {filteredItems.map((item) => {
              const active = selectedThread?.id === item.id;
              const titleLabel =
                item.threadType === "task_notification"
                  ? item.creatorLabel
                  : item.threadType === "meeting"
                    ? item.creatorLabel
                    : item.counterpartLabel;
              const metaLabel =
                item.threadType === "task_notification"
                  ? "Task creator"
                  : item.threadType === "meeting"
                    ? "Meeting notice"
                    : item.counterpartMeta;

              return (
                <div key={item.id} className={`inbox-list-card${active ? " active" : ""}`}>
                  <button
                    type="button"
                    className={`inbox-list-item inbox-page-list-item${active ? " active" : ""}`}
                    onClick={() => openThread(item.id)}
                  >
                    <div className="inbox-thread-list-head">
                      <div className="inbox-thread-list-person">
                        <span className="inbox-thread-list-avatar" aria-hidden="true">
                          {initialsFromName(titleLabel)}
                        </span>
                        <div>
                          <strong>{titleLabel}</strong>
                          <div className="inbox-thread-list-meta">{metaLabel}</div>
                        </div>
                      </div>
                      <span>{item.timeLabel}</span>
                    </div>
                    <div className="inbox-thread-list-subject">{item.subject}</div>
                    <p>{item.preview}</p>
                  </button>
                  {!item.isTrashed ? (
                    <button
                      type="button"
                      className="inbox-list-trash"
                      aria-label={`Move ${item.subject} to trash`}
                      title="Move to Trash. Permanently deleted after 31 days."
                      onClick={(event) => {
                        event.stopPropagation();
                        void submitTrashActionForThread(item.id, "trash");
                      }}
                      disabled={trashBusy}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 11V8h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
              );
            })}
            {!filteredItems.length ? <div className="task-empty">{activeEmptyLabel}</div> : null}
          </div>
        </section>

        <section className="inbox-reader-panel inbox-page-reader-panel">
          {composeOpen ? (
            <form className="inbox-compose-panel inbox-compose-panel-inline" onSubmit={submitCompose}>
              <div className="inbox-compose-panel-head">
                <div>
                  <h3>
                    {composeSubject.startsWith("Re:")
                      ? "Reply Message"
                      : composeSubject.startsWith("Fwd:")
                        ? "Forward Message"
                        : "Compose Message"}
                  </h3>
                  <p>
                    {composeSubject.startsWith("Re:")
                      ? "Continue the conversation in the inbox."
                      : composeSubject.startsWith("Fwd:")
                        ? "Forward this message inside the TTCS inbox."
                        : "Start a new inbox conversation inside TTCS."}
                  </p>
                </div>
                <button
                  type="button"
                  className="inbox-compose-close"
                  onClick={() => setComposeOpen(false)}
                  disabled={composeBusy}
                >
                  {"\u00D7"}
                </button>
              </div>
              <div className="inbox-compose-grid">
                <label className="drawer-field">
                  <div className="drawer-label">TO</div>
                  <div className="select-shell">
                    <select
                      className="drawer-input"
                      value={composeRecipientId}
                      onChange={(event) => setComposeRecipientId(event.target.value)}
                      disabled={composeBusy || !contacts.length}
                    >
                      {!contacts.length ? <option value="">No contacts available</option> : null}
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.fullName} ({contact.roleLabel})
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="drawer-field">
                  <div className="drawer-label">TITLE</div>
                  <input
                    className="drawer-input"
                    value={composeSubject}
                    onChange={(event) => setComposeSubject(event.target.value)}
                    placeholder="Message title..."
                    disabled={composeBusy}
                  />
                </label>
              </div>
              <label className="drawer-field">
                <div className="drawer-label">MESSAGE</div>
                <textarea
                  className="drawer-textarea inbox-compose-textarea"
                  value={composeBody}
                  onChange={(event) => setComposeBody(event.target.value)}
                  placeholder="Write your message..."
                  rows={7}
                  disabled={composeBusy}
                />
              </label>
              {composeError ? <div className="attachment-note attachment-error">{composeError}</div> : null}
              <div className="inbox-compose-actions">
                <span className="inbox-composer-note">The recipient will receive this in their TTCS inbox.</span>
                <button type="submit" className="primary-btn" disabled={composeBusy || !contacts.length}>
                  {composeBusy ? "Sending..." : "Send message"}
                </button>
              </div>
            </form>
          ) : selectedThread ? (
            <div className="inbox-thread-view">
              <div className="inbox-thread-head">
                <div>
                  <div className="inbox-thread-kicker">{selectedThread.counterpartMeta}</div>
                  <h3>{selectedThread.subject}</h3>
                  <p className="inbox-thread-copy">
                    {selectedThread.isTrashed
                      ? `Moved to trash. Deletes after ${selectedThread.trashExpiresLabel ?? "31 days"}.`
                      : selectedThread.canReply
                      ? `Conversation with ${selectedThread.counterpartLabel}`
                      : `Task created by ${selectedThread.creatorLabel}`}
                  </p>
                </div>
                <div className="inbox-thread-head-badges">
                  {selectedThread.taskId ? <span className="soft-badge">Task #{selectedThread.taskId}</span> : null}
                </div>
              </div>

              <div className="inbox-thread-messages">
                {selectedThread.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`inbox-message-card${message.isOutgoing ? " outgoing" : " incoming"}`}
                  >
                    <div className="inbox-message-meta">
                      <div className="inbox-message-author">
                        <span className="inbox-message-avatar" aria-hidden="true">
                          {message.senderInitials}
                        </span>
                        <div>
                          <strong>{message.senderLabel}</strong>
                          <div className="inbox-message-time">{message.timeLabel}</div>
                        </div>
                      </div>
                      {message.isOutgoing ? <span className="inbox-message-state">You</span> : null}
                    </div>
                    <div className="inbox-message-subject">{message.subject}</div>
                    <div className="inbox-message-body">
                      {message.body.split("\n").map((line, index) => (
                        <p key={`${message.id}-${index}`}>{line}</p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              {!replyOpen ? (
                <div className="inbox-thread-actions">
                  {!selectedThread.isTrashed && canReplyToSelectedThread ? (
                    <button type="button" className="btn-mini" onClick={openReplyComposer}>
                      Reply
                    </button>
                  ) : null}
                  {!selectedThread.isTrashed && selectedThread.threadType === "conversation" ? (
                    <button
                      type="button"
                      className="btn-mini ghost"
                      onClick={openForwardComposer}
                      disabled={!contacts.length}
                    >
                      Forward
                    </button>
                  ) : null}
                  {selectedThread.isTrashed ? (
                    <button
                      type="button"
                      className="btn-mini ghost"
                      onClick={() => submitTrashAction("restore")}
                      disabled={trashBusy}
                    >
                      {trashBusy ? "Restoring..." : "Restore"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-mini ghost"
                      onClick={() => submitTrashAction("trash")}
                      disabled={trashBusy}
                    >
                      {trashBusy ? "Moving..." : "Delete"}
                    </button>
                  )}
                </div>
              ) : null}

              {trashError ? <div className="attachment-note attachment-error inbox-thread-error">{trashError}</div> : null}

              {canReplyToSelectedThread && replyOpen && !selectedThread.isTrashed ? (
                <form className="inbox-composer" onSubmit={submitReply}>
                  <div className="inbox-composer-head">
                    <div>
                      <h4>Reply in TTCS</h4>
                      <p>
                        {selectedThread.canReply || selectedThread.threadType === "task_notification"
                          ? "Your message stays inside this conversation thread."
                          : "Your reply will start a direct inbox conversation with the task creator."}
                      </p>
                    </div>
                  </div>
                  <textarea
                    ref={replyInputRef}
                    className="inbox-composer-input"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder={`Write a reply to ${selectedThread.counterpartLabel}...`}
                    rows={5}
                    disabled={replyBusy}
                  />
                  {replyError ? <div className="attachment-note attachment-error">{replyError}</div> : null}
                  <div className="inbox-composer-actions">
                    <span className="inbox-composer-note">Press send to deliver your message in-app.</span>
                    <div className="inbox-composer-button-group">
                      <button
                        type="button"
                        className="btn-mini ghost"
                        onClick={() => setReplyOpen(false)}
                        disabled={replyBusy}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="primary-btn" disabled={replyBusy}>
                        {replyBusy ? "Sending..." : "Send reply"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}
            </div>
          ) : (
            <div className="inbox-reader-content inbox-page-reader-content">
              <div className="inbox-reader-icon inbox-page-reader-icon" aria-hidden="true">
                {"\uD83D\uDCEC"}
              </div>
              <div className="inbox-reader-message inbox-page-reader-message">{emptyLabel}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
