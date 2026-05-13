import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { hasSupabaseEnv } from "@/app/utils/utils/supabase/env";
import { RECOVERY_FLOW_COOKIE, RECOVERY_FLOW_MAX_AGE_SECONDS } from "@/lib/auth-recovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const flow = url.searchParams.get("flow");

  if (code && hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const response = NextResponse.redirect(new URL(next, url.origin));

  if (flow === "recovery") {
    response.cookies.set(RECOVERY_FLOW_COOKIE, "1", {
      httpOnly: true,
      maxAge: RECOVERY_FLOW_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: url.protocol === "https:",
    });
  }

  return response;
}
