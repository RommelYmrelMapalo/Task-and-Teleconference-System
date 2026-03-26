import Image from "next/image";
import { ReactNode } from "react";

export function PublicShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <div className="auth-container">
        <div className="auth-brand-mark" aria-hidden="true">
          <Image src="/PTV_LOGO.png" alt="" width={190} height={140} className="auth-brand-image" />
        </div>

        <section className="auth-box">
          <div className="auth-heading">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
