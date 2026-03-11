import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { hasSupabaseEnv } from "@/app/utils/utils/supabase/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";

  if (code && hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
