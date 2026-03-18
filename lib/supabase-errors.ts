type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function isMissingSupabaseTable(error: SupabaseLikeError | null | undefined) {
  if (!error) {
    return false;
  }

  const code = (error.code || "").toUpperCase();
  const message = (error.message || "").toLowerCase();

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

export function isMissingSupabaseColumn(
  error: SupabaseLikeError | null | undefined,
  columnName?: string,
) {
  if (!error) {
    return false;
  }

  const code = (error.code || "").toUpperCase();
  const message = (error.message || "").toLowerCase();
  const column = (columnName || "").toLowerCase();

  if (code !== "42703" && !message.includes("column") && !message.includes("does not exist")) {
    return false;
  }

  if (!column) {
    return true;
  }

  return message.includes(column);
}

export function isDuplicateEmailError(error: SupabaseLikeError | null | undefined) {
  if (!error) {
    return false;
  }

  const code = (error.code || "").toUpperCase();
  const message = (error.message || "").toLowerCase();
  const details = (error.details || "").toLowerCase();
  const hint = (error.hint || "").toLowerCase();

  return (
    code === "23505" ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("duplicate key value") ||
    message.includes("email address is invalid") && message.includes("already") ||
    details.includes("profiles_email_lower_unique") ||
    hint.includes("profiles_email_lower_unique")
  );
}

export function getEmailConflictMessage(
  error: SupabaseLikeError | null | undefined,
  fallbackMessage = "Unable to process the email address.",
) {
  if (isDuplicateEmailError(error)) {
    return "Email address is already in use.";
  }

  return error?.message || fallbackMessage;
}
