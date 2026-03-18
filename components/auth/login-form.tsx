"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/app/utils/utils/supabase/client";
import { hasSupabaseEnv, SUPABASE_ENV_HINT } from "@/app/utils/utils/supabase/env";
import { isMissingSupabaseTable, normalizeEmailAddress } from "@/lib/supabase-errors";

const isConfigured = hasSupabaseEnv();

export function LoginForm({ adminOnly = false }: { adminOnly?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setError(`Supabase is not configured yet. ${SUPABASE_ENV_HINT}`);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = normalizeEmailAddress(String(formData.get("email") || ""));
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setPending(false);
      setError(signInError.message);
      return;
    }

    const user = data.user;
    if (!user) {
      setPending(false);
      setError("Login succeeded but no session user was returned.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      if (isMissingSupabaseTable(profileError)) {
        if (adminOnly) {
          await supabase.auth.signOut();
          setPending(false);
          setError("Supabase schema is incomplete. Run ttcs/SUPABASE_SETUP.sql before using admin login.");
          return;
        }

        setPending(false);
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      await supabase.auth.signOut();
      setPending(false);
      setError(profileError.message);
      return;
    }

    const isAdmin = Boolean(profile?.is_admin);
    if (adminOnly && !isAdmin) {
      await supabase.auth.signOut();
      setPending(false);
      setError("This account is not an admin account.");
      return;
    }

    if (!adminOnly && isAdmin) {
      await supabase.auth.signOut();
      setPending(false);
      setError("Admin accounts must use the admin login page.");
      return;
    }

    const { error: loginStampError } = await supabase
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    if (loginStampError && !isMissingSupabaseTable(loginStampError)) {
      await supabase.auth.signOut();
      setPending(false);
      setError(loginStampError.message);
      return;
    }

    setPending(false);
    router.replace(adminOnly ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <input className="field-input" type="email" name="email" placeholder="Email Address" required />
      <div className="password-field-shell">
        <input
          className="field-input password-field-input"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Password"
          required
        />
        <button
          className="password-visibility-btn"
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? "Hide password" : "Show password"}
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
      <button className="primary-btn wide" type="submit" disabled={pending}>
        {pending ? "Signing In..." : adminOnly ? "Login as Admin" : "Login"}
      </button>
      {error ? <div className="field-error">{error}</div> : null}
      {!isConfigured ? <div className="field-error">{SUPABASE_ENV_HINT}</div> : null}
      <div className="auth-links-row">
        {adminOnly ? <Link href="/">Back to user login</Link> : <Link href="/sign-up">Create an account</Link>}
        {adminOnly ? null : <Link href="/admin/login">Admin login</Link>}
      </div>
    </form>
  );
}
