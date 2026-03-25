"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/app/utils/utils/supabase/admin";
import { requireSessionContext, type AppRole } from "@/lib/ttcs-data";
import { getEmailConflictMessage, normalizeEmailAddress } from "@/lib/supabase-errors";

export type CreateManagedUserState = {
  status: "idle" | "success" | "error";
  message: string | null;
  temporaryPassword: string | null;
};

export const initialCreateManagedUserState: CreateManagedUserState = {
  status: "idle",
  message: null,
  temporaryPassword: null,
};

const VALID_ROLES = new Set<AppRole>(["user", "admin"]);
const DEACTIVATION_DURATION = "876000h";
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateTemporaryPassword(length = 14) {
  let password = "";

  for (let index = 0; index < length; index += 1) {
    password += TEMP_PASSWORD_CHARS[randomInt(0, TEMP_PASSWORD_CHARS.length)];
  }

  return password;
}

export async function createManagedUserAction(
  _previousState: CreateManagedUserState,
  formData: FormData,
): Promise<CreateManagedUserState> {
  await requireSessionContext({ admin: true });

  const fullName = readText(formData, "fullName");
  const email = normalizeEmailAddress(readText(formData, "email"));
  const roleValue = readText(formData, "role");
  const role = VALID_ROLES.has(roleValue as AppRole) ? (roleValue as AppRole) : null;

  if (!fullName || !email || !role) {
    return {
      status: "error",
      message: "Full name, email, and role are required.",
      temporaryPassword: null,
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "Enter a valid email address.",
      temporaryPassword: null,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const admin = createAdminClient();
  const authResult = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authResult.error || !authResult.data.user) {
    return {
      status: "error",
      message: getEmailConflictMessage(authResult.error, "Unable to create the account."),
      temporaryPassword: null,
    };
  }

  const createdUser = authResult.data.user;
  const profileResult = await admin.from("profiles").upsert(
    {
      id: createdUser.id,
      email,
      full_name: fullName,
      is_admin: role === "admin",
      role,
    },
    { onConflict: "id" },
  );

  if (profileResult.error) {
    const rollbackResult = await admin.auth.admin.deleteUser(createdUser.id);

    return {
      status: "error",
      message: rollbackResult.error
        ? `Account was created in Auth, but syncing the profile failed: ${profileResult.error.message}`
        : `Profile setup failed, so the new auth account was rolled back: ${profileResult.error.message}`,
      temporaryPassword: null,
    };
  }

  revalidatePath("/admin/users");

  return {
    status: "success",
    message: `${role === "admin" ? "Admin" : "User"} account created for ${email}.`,
    temporaryPassword,
  };
}

export async function updateManagedUserAction(
  _previousState: CreateManagedUserState,
  formData: FormData,
): Promise<CreateManagedUserState> {
  const context = await requireSessionContext({ admin: true });

  const userId = readText(formData, "userId");
  const fullName = readText(formData, "fullName");
  const roleValue = readText(formData, "role");
  const role = VALID_ROLES.has(roleValue as AppRole) ? (roleValue as AppRole) : null;

  if (!userId || !fullName || !role) {
    return {
      status: "error",
      message: "User, full name, and role are required.",
      temporaryPassword: null,
    };
  }

  if (context.shellUser.id === userId && role !== "admin") {
    return {
      status: "error",
      message: "You cannot remove your own admin access.",
      temporaryPassword: null,
    };
  }

  const admin = createAdminClient();
  const authResult = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authResult.error) {
    return {
      status: "error",
      message: authResult.error.message || "Unable to update the auth profile.",
      temporaryPassword: null,
    };
  }

  const profileResult = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      is_admin: role === "admin",
      role,
    })
    .eq("id", userId);

  if (profileResult.error) {
    return {
      status: "error",
      message: profileResult.error.message || "Unable to update the profile.",
      temporaryPassword: null,
    };
  }

  revalidatePath("/admin/users");

  return {
    status: "success",
    message: "User profile updated.",
    temporaryPassword: null,
  };
}

export async function deleteManagedUserAction(formData: FormData): Promise<void> {
  const context = await requireSessionContext({ admin: true });
  const userId = readText(formData, "userId");

  if (!userId || userId === context.shellUser.id) {
    return;
  }

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin/users");
}

export async function toggleManagedUserActiveAction(
  _previousState: CreateManagedUserState,
  formData: FormData,
): Promise<CreateManagedUserState> {
  const context = await requireSessionContext({ admin: true });
  const userId = readText(formData, "userId");
  const nextMode = readText(formData, "nextMode");

  if (!userId || (nextMode !== "deactivate" && nextMode !== "reactivate")) {
    return {
      status: "error",
      message: "Invalid account action.",
      temporaryPassword: null,
    };
  }

  if (context.shellUser.id === userId) {
    return {
      status: "error",
      message: "You cannot deactivate your own account.",
      temporaryPassword: null,
    };
  }

  const admin = createAdminClient();
  const authResult = await admin.auth.admin.updateUserById(userId, {
    ban_duration: nextMode === "deactivate" ? DEACTIVATION_DURATION : "none",
  });

  if (authResult.error) {
    return {
      status: "error",
      message: authResult.error.message || "Unable to update the account status.",
      temporaryPassword: null,
    };
  }

  revalidatePath("/admin/users");

  return {
    status: "success",
    message: nextMode === "deactivate" ? "Account deactivated." : "Account reactivated.",
    temporaryPassword: null,
  };
}
