"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { initialCreateManagedUserState } from "@/app/admin/users/action-state";
import { createManagedUserAction } from "@/app/admin/users/actions";

function CreateUserSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-btn" type="submit" disabled={pending}>
      {pending ? "Creating Account..." : "Create Account"}
    </button>
  );
}

export function AdminUserCreateForm({
  onSuccess,
  onCancel,
  className,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const [state, formAction] = useActionState(createManagedUserAction, initialCreateManagedUserState);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [onSuccess, state.status]);

  return (
    <div className={`users-create-card${className ? ` ${className}` : ""}`}>
      <div className="drawer-banner">
        Create user or admin accounts manually. A temporary password will be generated automatically after the account
        is created.
      </div>
      <form ref={formRef} action={formAction} className="form-stack task-edit-form manage-users-task-form">
        <div className="users-form-grid">
          <div className="users-form-field">
            <label className="users-form-label drawer-label" htmlFor="managed-user-full-name">
              Full Name
            </label>
            <input
              id="managed-user-full-name"
              className="field-input"
              name="fullName"
              placeholder="Enter full name"
              autoComplete="name"
              required
            />
          </div>
          <div className="users-form-field">
            <label className="users-form-label drawer-label" htmlFor="managed-user-email">
              Email
            </label>
            <input
              id="managed-user-email"
              className="field-input"
              type="email"
              name="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </div>
        </div>
        <div className="users-form-grid users-form-grid-compact">
          <div className="users-form-field">
            <label className="users-form-label drawer-label" htmlFor="managed-user-role">
              Role
            </label>
            <div className="select-shell">
              <select
                id="managed-user-role"
                className="field-input field-select"
                name="role"
                defaultValue="user"
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
            <CreateUserSubmitButton />
          </div>
        </div>
        {state.message ? (
          <div className={state.status === "error" ? "field-error" : "field-success"}>
            <div>{state.message}</div>
            {state.status === "success" && state.temporaryPassword ? (
              <div className="users-generated-password">
                <span className="users-generated-password-label">Temporary Password</span>
                <code className="users-generated-password-value">{state.temporaryPassword}</code>
                <span className="users-generated-password-note">
                  Share this securely with the user. They can change it later from their account.
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
