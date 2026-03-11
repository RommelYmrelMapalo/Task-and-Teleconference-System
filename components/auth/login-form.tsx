"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/app/utils/utils/supabase/client";
import { hasSupabaseEnv, SUPABASE_ENV_HINT } from "@/app/utils/utils/supabase/env";
import { isMissingSupabaseTable } from "@/lib/supabase-errors";

const isConfigured = hasSupabaseEnv();

export function LoginForm({ adminOnly = false }: { adminOnly?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setError(`Supabase is not configured yet. ${SUPABASE_ENV_HINT}`);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
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
      <input className="field-input" type="password" name="password" placeholder="Password" required />
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
