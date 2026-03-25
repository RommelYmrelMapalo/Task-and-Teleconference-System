"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import type { AdminProfileListItem } from "@/lib/ttcs-data";
import {
  initialCreateManagedUserState,
  toggleManagedUserActiveAction,
  updateManagedUserAction,
} from "@/app/admin/users/actions";

function UpdateUserSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-btn" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

function ToggleUserStatusButton({ isDeactivated }: { isDeactivated: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={`btn-mini ${isDeactivated ? "" : "ghost"}`} disabled={pending}>
      {pending ? "Updating..." : isDeactivated ? "Reactivate Account" : "Deactivate Account"}
    </button>
  );
}

export function AdminUserEditForm({
  user,
  onSuccess,
  onCancel,
}: {
  user: AdminProfileListItem;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(updateManagedUserAction, initialCreateManagedUserState);
  const [statusState, statusAction] = useActionState(toggleManagedUserActiveAction, initialCreateManagedUserState);
  const isDeactivated = user.statusTone === "deactivated";

  useEffect(() => {
    if (state.status === "success") {
      onSuccess?.();
    }
  }, [onSuccess, state.status]);

  useEffect(() => {
    if (statusState.status === "success") {
      onSuccess?.();
    }
  }, [onSuccess, statusState.status]);

  return (
    <div className="users-create-card manage-users-modal-form">
      <div className="drawer-banner">Update the display name or change whether this account has admin access.</div>
      <div className="manage-users-edit-status-row">
        <span className={`manage-users-status manage-users-status-${user.statusTone}`}>{user.statusLabel}</span>
        <span className="users-form-note">Last active: {user.lastActiveLabel}</span>
      </div>
      <form action={formAction} className="form-stack task-edit-form manage-users-task-form">
        <input type="hidden" name="userId" value={user.id} />
        <div className="users-form-grid">
          <div className="users-form-field">
            <label className="users-form-label drawer-label" htmlFor={`edit-user-full-name-${user.id}`}>
              Full Name
            </label>
            <input
              id={`edit-user-full-name-${user.id}`}
              className="field-input"
              name="fullName"
              defaultValue={user.fullName}
              required
            />
          </div>
          <div className="users-form-field">
            <label className="users-form-label drawer-label" htmlFor={`edit-user-email-${user.id}`}>
              Email
            </label>
            <input
              id={`edit-user-email-${user.id}`}
              className="field-input"
              value={user.email}
              readOnly
              aria-readonly="true"
            />
          </div>
        </div>
        <div className="users-form-grid users-form-grid-compact">
          <div className="users-form-field">
            <label className="users-form-label drawer-label" htmlFor={`edit-user-role-${user.id}`}>
              Role
            </label>
            <div className="select-shell">
              <select
                id={`edit-user-role-${user.id}`}
                className="field-input field-select"
                name="role"
                defaultValue={user.role}
                required
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <span className="select-arrow" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          {onCancel ? (
            <button type="button" className="btn-mini drawer-cancel" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <div className="users-form-actions">
            <UpdateUserSubmitButton />
          </div>
        </div>
        {state.message ? (
          <div className={state.status === "error" ? "field-error" : "field-success"}>{state.message}</div>
        ) : null}
      </form>
      <form action={statusAction} className="manage-users-status-form">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="nextMode" value={isDeactivated ? "reactivate" : "deactivate"} />
        <ToggleUserStatusButton isDeactivated={isDeactivated} />
        {statusState.message ? (
          <div className={statusState.status === "error" ? "field-error" : "field-success"}>
            {statusState.message}
          </div>
        ) : null}
      </form>
    </div>
  );
}
