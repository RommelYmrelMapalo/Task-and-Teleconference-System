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
        <div className="auth-panel-group">
          <aside className="auth-brand-panel" aria-hidden="true">
            <Image src="/PTV_LOGO.png" alt="" width={150} height={112} className="auth-brand-panel-image" />
          </aside>

          <section className="auth-box">
            <div className="auth-heading">
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
