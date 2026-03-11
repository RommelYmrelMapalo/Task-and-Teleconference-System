import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalSessionContext } from "@/lib/ttcs-data";

export default async function LoginPage() {
  const context = await getOptionalSessionContext();

  if (context) {
    redirect(context.profile.is_admin ? "/admin" : "/dashboard");
  }

  return (
    <PublicShell title="User Login" subtitle="Sign in to your TTCS account">
      <LoginForm />
    </PublicShell>
  );
}
