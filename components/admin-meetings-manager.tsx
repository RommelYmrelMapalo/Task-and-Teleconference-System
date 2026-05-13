"use client";

import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { initialCreateMeetingState } from "@/app/admin/meetings/action-state";
import { createMeetingAction } from "@/app/admin/meetings/actions";
import type { AdminProfileListItem } from "@/lib/ttcs-data";

function CreateMeetingSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-btn" type="submit" disabled={pending}>
      {pending ? "Creating Meeting..." : "Create Meeting"}
    </button>
  );
}

export function AdminMeetingsManager({
  users,
}: {
  users: AdminProfileListItem[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useActionState(createMeetingAction, initialCreateMeetingState);
  const [participantQuery, setParticipantQuery] = useState("");
  const deferredParticipantQuery = useDeferredValue(participantQuery);
  const selectableUsers = useMemo(
    () => users.filter((user) => user.statusTone !== "deactivated"),
    [users],
  );
  const normalizedParticipantQuery = deferredParticipantQuery.trim().toLowerCase();
  const roleOptions = useMemo(() => {
    const options = new Map<
      AdminProfileListItem["role"],
      {
        role: AdminProfileListItem["role"];
        label: string;
        count: number;
      }
    >();

    for (const user of selectableUsers) {
      const existing = options.get(user.role);
      if (existing) {
        existing.count += 1;
        continue;
      }

      options.set(user.role, {
        role: user.role,
        label: user.roleLabel,
        count: 1,
      });
    }

    return Array.from(options.values());
  }, [selectableUsers]);
  const filteredParticipants = useMemo(() => {
    if (!normalizedParticipantQuery) {
      return selectableUsers;
    }

    return selectableUsers.filter((user) => {
      const haystacks = [user.fullName, user.email, user.roleLabel, user.username];
      return haystacks.some((value) => value.toLowerCase().includes(normalizedParticipantQuery));
    });
  }, [normalizedParticipantQuery, selectableUsers]);
  const filteredAdmins = useMemo(
    () => filteredParticipants.filter((user) => user.role === "admin"),
    [filteredParticipants],
  );
  const filteredRegularUsers = useMemo(
    () => filteredParticipants.filter((user) => user.role === "user"),
    [filteredParticipants],
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
              <div className="meeting-selection-stack">
                {roleOptions.length ? (
                  <div className="meeting-selection-block">
                    <div className="meeting-selection-copy">
                      <div className="meeting-selection-heading">Assign By Role</div>
                      <p className="meeting-card-copy">
                        Select a role when everyone in that group should receive the meeting notice.
                      </p>
                    </div>
                    <div className="meeting-participant-grid meeting-role-grid">
                      {roleOptions.map((roleOption) => (
                        <label className="meeting-participant-option meeting-role-option" key={roleOption.role}>
                          <input type="checkbox" name="participantRoles" value={roleOption.role} />
                          <span className="meeting-participant-copy">
                            <strong>{roleOption.label === "Admin" ? "All Admins" : "All Users"}</strong>
                            <span>
                              {roleOption.count} available participant{roleOption.count === 1 ? "" : "s"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="meeting-selection-block">
                  <div className="meeting-selection-copy">
                    <div className="meeting-selection-heading">Assign Individually</div>
                    <p className="meeting-card-copy">
                      Search and assign specific people here. Role and individual selections are merged automatically.
                    </p>
                  </div>
                  <div className="meeting-participant-toolbar">
                    <div className="users-form-field">
                      <label className="users-form-label drawer-label" htmlFor="participant-search">
                        Search Participants
                      </label>
                      <input
                        id="participant-search"
                        className="field-input"
                        type="search"
                        value={participantQuery}
                        onChange={(event) => setParticipantQuery(event.target.value)}
                        placeholder="Search by name, username, email, or role"
                      />
                    </div>
                    <div className="meeting-selection-meta">
                      Showing {filteredParticipants.length} of {selectableUsers.length} participant
                      {selectableUsers.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  {filteredParticipants.length ? (
                    <div className="meeting-people-columns">
                      <div className="meeting-people-panel">
                        <div className="meeting-people-panel-head">
                          <div className="meeting-selection-heading">Admins</div>
                          <span className="pill task">{filteredAdmins.length}</span>
                        </div>
                        <div className="meeting-people-list" role="group" aria-label="Admin participants">
                          {filteredAdmins.length ? (
                            filteredAdmins.map((user) => (
                              <label className="meeting-participant-option" key={user.id}>
                                <input type="checkbox" name="participantIds" value={user.id} />
                                <span className="meeting-participant-copy">
                                  <strong>{user.fullName}</strong>
                                  <span>{user.email}</span>
                                </span>
                              </label>
                            ))
                          ) : (
                            <div className="meeting-empty-copy">No admins match the current search.</div>
                          )}
                        </div>
                      </div>
                      <div className="meeting-people-panel">
                        <div className="meeting-people-panel-head">
                          <div className="meeting-selection-heading">Users</div>
                          <span className="pill task">{filteredRegularUsers.length}</span>
                        </div>
                        <div className="meeting-people-list" role="group" aria-label="User participants">
                          {filteredRegularUsers.length ? (
                            filteredRegularUsers.map((user) => (
                              <label className="meeting-participant-option" key={user.id}>
                                <input type="checkbox" name="participantIds" value={user.id} />
                                <span className="meeting-participant-copy">
                                  <strong>{user.fullName}</strong>
                                  <span>{user.email}</span>
                                </span>
                              </label>
                            ))
                          ) : (
                            <div className="meeting-empty-copy">No users match the current search.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="meeting-empty-copy">No participants match the current search.</div>
                  )}
                </div>
              </div>
            ) : (
	              <div className="meeting-empty-copy">No active users are currently available for meeting assignments.</div>
	            )}

	            <div className="meeting-actions">
	              <div className="users-form-actions">
	              <CreateMeetingSubmitButton />
	              </div>
	            </div>
	          </div>

          {state.message ? (
            <div className={state.status === "error" ? "field-error" : "field-success"}>{state.message}</div>
          ) : null}
        </form>
      </section>
    </div>
  );
}
