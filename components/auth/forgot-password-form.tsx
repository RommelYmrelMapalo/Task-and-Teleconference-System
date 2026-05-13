"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/app/utils/utils/supabase/client";
import { hasSupabaseEnv, SUPABASE_ENV_HINT } from "@/app/utils/utils/supabase/env";
import { normalizeEmailAddress } from "@/lib/supabase-errors";

const isConfigured = hasSupabaseEnv();

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setError(`Supabase is not configured yet. ${SUPABASE_ENV_HINT}`);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = normalizeEmailAddress(String(formData.get("email") || ""));

    if (!email) {
      setError("Email is required.");
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    const redirectUrl = new URL("/auth/callback", window.location.origin);
    redirectUrl.searchParams.set("next", "/reset-password");
    redirectUrl.searchParams.set("flow", "recovery");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl.toString(),
    });

    setPending(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      `If an account exists for ${email}, TTCS sent a password reset link. Open the email and follow the recovery link to create a new password.`,
    );
    form.reset();
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <input className="field-input" type="email" name="email" placeholder="Email Address" required />
      <button className="primary-btn wide" type="submit" disabled={pending}>
        {pending ? "Sending Reset Link..." : "Send Reset Link"}
      </button>
      {error ? <div className="field-error">{error}</div> : null}
      {message ? <div className="field-success">{message}</div> : null}
      {!isConfigured ? <div className="field-error">{SUPABASE_ENV_HINT}</div> : null}
      <div className="auth-links-row">
        <Link href="/">Back to login</Link>
        <Link href="/admin/login">Admin login</Link>
      </div>
    </form>
  );
}
