"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/app/utils/utils/supabase/client";
import { hasSupabaseEnv, SUPABASE_ENV_HINT } from "@/app/utils/utils/supabase/env";

const isConfigured = hasSupabaseEnv();

export function ResetPasswordForm({ recoveryAllowed }: { recoveryAllowed: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recoveryAllowed) {
      setError("This recovery link is missing or has expired. Request a new password reset email.");
      return;
    }

    if (!isConfigured) {
      setError(`Supabase is not configured yet. ${SUPABASE_ENV_HINT}`);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!password || !confirmPassword) {
      setError("New password and confirmation are required.");
      return;
    }

    if (password.length < 7) {
      setError("Password must be at least 7 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPending(false);
      setError("This recovery session is no longer valid. Request a new password reset email.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setPending(false);
      setError(updateError.message);
      return;
    }

    await Promise.allSettled([
      supabase.auth.signOut(),
      fetch("/auth/recovery-complete", {
        method: "POST",
      }),
    ]);

    setPending(false);
    router.replace("/?passwordReset=1");
    router.refresh();
  }

  if (!recoveryAllowed) {
    return (
      <div className="form-stack">
        <div className="field-error">This recovery session is not active. Request a new password reset email to continue.</div>
        <div className="auth-links-row">
          <Link href="/forgot-password">Request a reset link</Link>
          <Link href="/">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <div className="password-field-shell">
        <input
          className="field-input password-field-input"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="New Password"
          required
        />
        <button
          className="password-visibility-btn"
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? "Hide new password" : "Show new password"}
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
              <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8-1 2.8-3 5.09-5.62 6.43" />
              <path d="M6.61 6.61C4.62 8 3.09 9.87 2 12c1.73 4.89 6 8 10 8a10.8 10.8 0 0 0 4-.78" />
            </svg>
          )}
        </button>
      </div>
      <div className="password-field-shell">
        <input
          className="field-input password-field-input"
          type={showConfirmPassword ? "text" : "password"}
          name="confirmPassword"
          placeholder="Confirm New Password"
          required
        />
        <button
          className="password-visibility-btn"
          type="button"
          onClick={() => setShowConfirmPassword((current) => !current)}
          aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
          aria-pressed={showConfirmPassword}
        >
          {showConfirmPassword ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
              <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8-1 2.8-3 5.09-5.62 6.43" />
              <path d="M6.61 6.61C4.62 8 3.09 9.87 2 12c1.73 4.89 6 8 10 8a10.8 10.8 0 0 0 4-.78" />
            </svg>
          )}
        </button>
      </div>
      <button className="primary-btn wide" type="submit" disabled={pending}>
        {pending ? "Updating Password..." : "Update Password"}
      </button>
      {error ? <div className="field-error">{error}</div> : null}
      {!isConfigured ? <div className="field-error">{SUPABASE_ENV_HINT}</div> : null}
      <div className="auth-links-row">
        <Link href="/forgot-password">Request another link</Link>
        <Link href="/">Back to login</Link>
      </div>
    </form>
  );
}
