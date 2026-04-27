"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createMeetingAction,
  initialCreateMeetingState,
} from "@/app/admin/meetings/actions";
import type { AdminProfileListItem, MeetingItem } from "@/lib/ttcs-data";

function CreateMeetingSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-btn" type="submit" disabled={pending}>
      {pending ? "Creating Meeting..." : "Create Meeting"}
    </button>
  );
}

function formatParticipantSummary(meeting: MeetingItem) {
  if (!meeting.assignees.length) {
    return "No participants yet";
  }

  if (meeting.assignees.length <= 3) {
    return meeting.assignees.map((assignee) => assignee.fullName).join(", ");
  }

  const visibleNames = meeting.assignees.slice(0, 3).map((assignee) => assignee.fullName);
  return `${visibleNames.join(", ")} +${meeting.assignees.length - visibleNames.length} more`;
}

export function AdminMeetingsManager({
  meetings,
  users,
}: {
  meetings: MeetingItem[];
  users: AdminProfileListItem[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useActionState(createMeetingAction, initialCreateMeetingState);
  const [renderedAt] = useState(() => Date.now());
  const selectableUsers = useMemo(
    () => users.filter((user) => user.statusTone !== "deactivated"),
    [users],
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="page-stack">
      <section className="page-card meeting-create-card">
        <div className="card-headline">
          <div>
            <h3>Create Meeting</h3>
            <p className="meeting-card-copy">
              Schedule a meeting, assign participants, and send the meeting notice into each participant&apos;s inbox.
            </p>
          </div>
          <span className="pill meeting">Meeting</span>
        </div>

        <form ref={formRef} action={formAction} className="form-stack task-edit-form meeting-create-form">
          <div className="users-form-grid">
            <div className="users-form-field">
              <label className="users-form-label drawer-label" htmlFor="meeting-title">
                Title
              </label>
              <input
                id="meeting-title"
                className="field-input"
                name="title"
                placeholder="Quarterly planning session"
                required
              />
            </div>
            <div className="users-form-field">
              <label className="users-form-label drawer-label" htmlFor="meeting-room">
                Room or Link
              </label>
              <input
                id="meeting-room"
                className="field-input"
                name="room"
                placeholder="Conference Room A or video link"
              />
            </div>
          </div>

          <div className="users-form-grid">
            <div className="users-form-field">
              <label className="users-form-label drawer-label" htmlFor="meeting-date">
                Date
              </label>
              <input id="meeting-date" className="field-input" type="date" name="meetingDate" required />
            </div>
            <div className="users-form-field">
              <label className="users-form-label drawer-label" htmlFor="meeting-time">
                Start Time
              </label>
              <input id="meeting-time" className="field-input" type="time" name="meetingTime" required />
            </div>
            <div className="users-form-field">
              <label className="users-form-label drawer-label" htmlFor="meeting-end-time">
                End Time
              </label>
              <input id="meeting-end-time" className="field-input" type="time" name="endTime" />
            </div>
          </div>

          <div className="users-form-field">
            <label className="users-form-label drawer-label" htmlFor="meeting-description">
              Description
            </label>
            <textarea
              id="meeting-description"
              className="field-input meeting-description-input"
              name="description"
              placeholder="Agenda, preparation notes, or supporting context"
            />
          </div>

          <div className="meeting-participants-shell">
            <div className="card-headline">
              <div>
                <h3>Participants</h3>
                <p className="meeting-card-copy">
                  Select who should see the meeting in their dashboard, assigned meetings page, and inbox.
                </p>
              </div>
              <span className="pill task">{selectableUsers.length} Available</span>
            </div>

            {selectableUsers.length ? (
              <div className="meeting-participant-grid">
                {selectableUsers.map((user) => (
                  <label className="meeting-participant-option" key={user.id}>
                    <input type="checkbox" name="participantIds" value={user.id} />
                    <span className="meeting-participant-copy">
                      <strong>{user.fullName}</strong>
                      <span>{user.roleLabel}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="meeting-empty-copy">No active users are currently available for meeting assignments.</div>
            )}
          </div>

          <div className="drawer-footer">
            <div className="users-form-actions">
              <CreateMeetingSubmitButton />
            </div>
          </div>

          {state.message ? (
            <div className={state.status === "error" ? "field-error" : "field-success"}>{state.message}</div>
          ) : null}
        </form>
      </section>

      {meetings.length ? (
        <div className="page-grid two-col">
          {meetings.map((meeting) => {
            const isPast = new Date(meeting.dateTime).getTime() < renderedAt;

            return (
              <section className="page-card meeting-record-card" key={meeting.id}>
                <div className="card-headline">
                  <div>
                    <h3>{meeting.title}</h3>
                    <p className="meeting-card-copy">
                      Created by {meeting.createdByLabel}
                    </p>
                  </div>
                  <span className={`pill ${isPast ? "task" : "meeting"}`}>{isPast ? "Past" : "Upcoming"}</span>
                </div>
                <p>{meeting.dateLabel}</p>
                <p>{meeting.timeLabel}</p>
                <p>{meeting.room ? `Room: ${meeting.room}` : "Room: To be announced"}</p>
                <p>{meeting.description}</p>
                <p className="meeting-participant-summary">
                  Participants: {formatParticipantSummary(meeting)}
                </p>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
