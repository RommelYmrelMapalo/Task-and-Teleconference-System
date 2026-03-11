type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

const SUPABASE_PUBLIC_KEY_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export const SUPABASE_ENV_HINT =
  "Set NEXT_PUBLIC_SUPABASE_URL and one of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY.";

function getSupabasePublicKey() {
  for (const envName of SUPABASE_PUBLIC_KEY_ENV_NAMES) {
    const value = process.env[envName];
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey());
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = getSupabasePublicKey();

  if (!url || !publishableKey) {
    throw new Error(`Missing Supabase environment variables. ${SUPABASE_ENV_HINT}`);
  }

  return { url, publishableKey };
}
