import { NextResponse } from "next/server";
import { RECOVERY_FLOW_COOKIE } from "@/lib/auth-recovery";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(RECOVERY_FLOW_COOKIE);
  return response;
}
