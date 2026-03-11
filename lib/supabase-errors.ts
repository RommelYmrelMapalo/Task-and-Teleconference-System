type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

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
