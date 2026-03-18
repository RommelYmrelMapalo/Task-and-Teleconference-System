"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/utils/supabase/client";
import { getEmailConflictMessage, normalizeEmailAddress } from "@/lib/supabase-errors";
import type { ShellUser } from "@/lib/ttcs-data";

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function ProfileEditor({
  user,
  heading,
}: {
  user: ShellUser;
  heading: string;
}) {
  const router = useRouter();
  const { firstName, lastName } = splitName(user.fullName);
  const [pendingSection, setPendingSection] = useState<"name" | "email" | "password" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingSection("name");
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const fullName = [formData.get("firstName"), formData.get("lastName")]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");

    if (fullName.length < 2) {
      setPendingSection(null);
      setError("Name must be at least 2 characters.");
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);

    setPendingSection(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Profile name updated.");
    router.refresh();
  };

  const saveEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingSection("email");
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = normalizeEmailAddress(String(formData.get("email") || ""));

    if (!email) {
      setPendingSection(null);
      setError("Email is required.");
      return;
    }

    if (email === normalizeEmailAddress(user.email)) {
      setPendingSection(null);
      setMessage("Email address is already up to date.");
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ email });

    setPendingSection(null);

    if (updateError) {
      setError(getEmailConflictMessage(updateError, "Unable to update the email address."));
      return;
    }

    setMessage("Email update requested. Check your inbox if confirmation is required.");
    router.refresh();
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingSection("password");
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") || "");
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!currentPassword) {
      setPendingSection(null);
      setError("Current password is required.");
      return;
    }

    if (password.length < 7) {
      setPendingSection(null);
      setError("Password must be at least 7 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setPendingSection(null);
      setError("New passwords do not match.");
      return;
    }

    const supabase = createClient();
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: normalizeEmailAddress(user.email),
      password: currentPassword,
    });

    if (reauthError) {
      setPendingSection(null);
      setError("Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setPendingSection(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated.");
    event.currentTarget.reset();
  };

  return (
    <div className="page-grid profile-grid">
      <section className="page-card">
        <h3>{heading}</h3>
        <form className="form-stack" onSubmit={saveName}>
          <input className="field-input" defaultValue={firstName} name="firstName" placeholder="First name" />
          <input className="field-input" defaultValue={lastName} name="lastName" placeholder="Last name" />
          <button className="primary-btn" type="submit" disabled={pendingSection === "name"}>
            {pendingSection === "name" ? "Saving..." : "Save Name"}
          </button>
        </form>
      </section>

      <section className="page-card">
        <h3>Email</h3>
        <form className="form-stack" onSubmit={saveEmail}>
          <input className="field-input" defaultValue={user.email} name="email" placeholder="Email address" />
          <button className="primary-btn" type="submit" disabled={pendingSection === "email"}>
            {pendingSection === "email" ? "Updating..." : "Update Email"}
          </button>
        </form>
      </section>

      <section className="page-card">
        <h3>Password</h3>
        <form className="form-stack" onSubmit={savePassword}>
          <input className="field-input" type="password" name="currentPassword" placeholder="Current password" required />
          <input className="field-input" type="password" name="password" placeholder="New password" required />
          <input
            className="field-input"
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            required
          />
          <button className="primary-btn" type="submit" disabled={pendingSection === "password"}>
            {pendingSection === "password" ? "Updating..." : "Change Password"}
          </button>
        </form>
      </section>

      {message ? <div className="field-success">{message}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  );
}
