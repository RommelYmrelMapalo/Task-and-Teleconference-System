import Image from "next/image";
import { ReactNode } from "react";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

export function PublicShell({
  path,
  title,
  subtitle,
  children,
}: {
  path: string;
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
            <PageBreadcrumbs pathname={path} title={title} subtitle={subtitle} centered />
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
