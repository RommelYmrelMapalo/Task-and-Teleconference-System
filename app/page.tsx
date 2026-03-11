import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function LoginPage() {
  return (
    <PublicShell title="User Login" subtitle="Sign in to your TTCS account">
      <div className="form-stack">
        <input className="field-input light" type="email" placeholder="Email Address" />
        <input className="field-input light" type="password" placeholder="Password" />
        <button className="primary-btn wide" type="button">
          Login
        </button>
        <div className="auth-links-row">
          <Link href="/sign-up">Create an account</Link>
          <Link href="/admin/login">Admin login</Link>
        </div>
      </div>
    </PublicShell>
  );
}
