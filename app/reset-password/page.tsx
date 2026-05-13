import { cookies } from "next/headers";
import { PublicShell } from "@/components/public-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { RECOVERY_FLOW_COOKIE } from "@/lib/auth-recovery";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const recoveryAllowed = cookieStore.get(RECOVERY_FLOW_COOKIE)?.value === "1";

  return (
    <PublicShell title="Reset Password" subtitle="Create a new password for your TTCS account">
      <ResetPasswordForm recoveryAllowed={recoveryAllowed} />
    </PublicShell>
  );
}
