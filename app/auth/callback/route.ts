import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/utils/supabase/server";
import { hasSupabaseEnv } from "@/app/utils/utils/supabase/env";
import { RECOVERY_FLOW_COOKIE, RECOVERY_FLOW_MAX_AGE_SECONDS } from "@/lib/auth-recovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const flow = url.searchParams.get("flow");
  const isRecoveryFlow = flow === "recovery" || type === "recovery";
  const next = url.searchParams.get("next") || (isRecoveryFlow ? "/reset-password" : "/dashboard");

  if (hasSupabaseEnv()) {
    const supabase = await createClient();

    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
      });
    }
  }

  const response = NextResponse.redirect(new URL(next, url.origin));

  if (isRecoveryFlow) {
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
