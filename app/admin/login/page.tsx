import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalSessionContext } from "@/lib/ttcs-data";

export default async function AdminLoginPage() {
  const context = await getOptionalSessionContext();

  if (context) {
    redirect(context.profile.is_admin ? "/admin" : "/dashboard");
  }

  return (
    <PublicShell title="Admin Login" subtitle="Access the TTCS administration panel">
      <LoginForm adminOnly />
    </PublicShell>
  );
}
