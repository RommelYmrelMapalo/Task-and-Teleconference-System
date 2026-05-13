import { PublicShell } from "@/components/public-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <PublicShell title="Forgot Password" subtitle="Request a TTCS password reset link">
      <ForgotPasswordForm />
    </PublicShell>
  );
}
