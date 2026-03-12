type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_PUBLISHABLE_DEFAULT_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_ENV_HINT =
  "Set NEXT_PUBLIC_SUPABASE_URL and one of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY.";

function getSupabasePublicKey() {
  return SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_DEFAULT_KEY || SUPABASE_ANON_KEY;
}

export function hasSupabaseEnv() {
  return Boolean(SUPABASE_URL && getSupabasePublicKey());
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = SUPABASE_URL;
  const publishableKey = getSupabasePublicKey();

  if (!url || !publishableKey) {
    throw new Error(`Missing Supabase environment variables. ${SUPABASE_ENV_HINT}`);
  }

  return { url, publishableKey };
}
