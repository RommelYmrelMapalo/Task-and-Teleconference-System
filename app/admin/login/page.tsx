import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function AdminLoginPage() {
  return (
    <PublicShell title="Admin Login" subtitle="Access the TTCS administration panel">
      <div className="form-stack">
        <input className="field-input light" type="email" placeholder="Admin Email" />
        <input className="field-input light" type="password" placeholder="Password" />
        <button className="primary-btn wide" type="button">
          Login as Admin
        </button>
        <div className="auth-links-row">
          <Link href="/">Back to user login</Link>
        </div>
      </div>
    </PublicShell>
  );
}
