import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getOptionalSessionContext } from "@/lib/ttcs-data";

export default async function SignUpPage() {
  const context = await getOptionalSessionContext();

  if (context) {
    redirect(context.profile.is_admin ? "/admin" : "/dashboard");
  }

  return (
    <PublicShell title="Sign Up" subtitle="Create a TTCS user account">
      <SignUpForm />
    </PublicShell>
  );
}
