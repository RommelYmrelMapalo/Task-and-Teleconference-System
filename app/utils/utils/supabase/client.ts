import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/app/utils/utils/supabase/env";

export const createClient = () => {
  const { url, publishableKey } = getSupabaseEnv();

  return createBrowserClient(url, publishableKey);
};
