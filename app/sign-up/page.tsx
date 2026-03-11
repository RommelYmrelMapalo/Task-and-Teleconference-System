import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function SignUpPage() {
  return (
    <PublicShell title="Sign Up" subtitle="Create a TTCS user account">
      <div className="form-stack">
        <input className="field-input light" type="email" placeholder="Email Address" />
        <input className="field-input light" placeholder="First Name" />
        <input className="field-input light" placeholder="Last Name" />
        <input className="field-input light" type="password" placeholder="Password" />
        <input className="field-input light" type="password" placeholder="Confirm Password" />
        <button className="primary-btn wide" type="button">
          Create Account
        </button>
        <div className="auth-links-row">
          <Link href="/">Already have an account?</Link>
        </div>
      </div>
    </PublicShell>
  );
}
