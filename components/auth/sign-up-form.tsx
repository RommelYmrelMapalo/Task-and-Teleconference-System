"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/app/utils/utils/supabase/client";
import { hasSupabaseEnv, SUPABASE_ENV_HINT } from "@/app/utils/utils/supabase/env";
import { getEmailConflictMessage, normalizeEmailAddress } from "@/lib/supabase-errors";

const isConfigured = hasSupabaseEnv();

export function SignUpForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setError(`Supabase is not configured yet. ${SUPABASE_ENV_HINT}`);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = normalizeEmailAddress(String(formData.get("email") || ""));
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    if (!email || !firstName || !password || !confirmPassword) {
      setError("All required fields must be filled in.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 7) {
      setError("Password must be at least 7 characters long.");
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          full_name: fullName,
        },
      },
    });

    setPending(false);

    if (signUpError) {
      setError(getEmailConflictMessage(signUpError, "Unable to create the account."));
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setMessage(`Welcome to TTCS. We sent a confirmation link to ${email}. Open the email and select "Confirm my email" to finish setting up your account.`);
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <input className="field-input" type="email" name="email" placeholder="Email Address" required />
      <input className="field-input" name="firstName" placeholder="First Name" required />
      <input className="field-input" name="lastName" placeholder="Last Name" />
      <input className="field-input" type="password" name="password" placeholder="Password" required />
      <input
        className="field-input"
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        required
      />
      <button className="primary-btn wide" type="submit" disabled={pending}>
        {pending ? "Creating Account..." : "Create Account"}
      </button>
      {error ? <div className="field-error">{error}</div> : null}
      {message ? <div className="field-success">{message}</div> : null}
      {!isConfigured ? <div className="field-error">{SUPABASE_ENV_HINT}</div> : null}
      <div className="auth-links-row">
        <Link href="/">Already have an account?</Link>
      </div>
    </form>
  );
}
