"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { SidebarIcon } from "./sidebar-icons";

const navGroups = [
  {
    section: "MAIN",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" as const }],
  },
  {
    section: "ADMIN MODULES",
    items: [
      { href: "/admin/tasks", label: "Manage Tasks", icon: "tasks" as const },
      { href: "/admin/meetings", label: "Manage Meetings", icon: "meetings" as const },
      { href: "/admin/monitoring", label: "Monitoring Panel", icon: "monitoring" as const },
      { href: "/admin/users", label: "Manage Users", icon: "users" as const },
      { href: "/admin/reports", label: "Reports", icon: "reports" as const },
      { href: "/admin/inbox", label: "Inbox", icon: "inbox" as const, badge: "6" },
      { href: "/admin/profile", label: "Profile", icon: "profile" as const },
    ],
  },
];

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="dashboard-page">
      <div className="app-shell">
        <aside className="sidebar-dark">
          <div className="sidebar-brand">
            <Image
              src="/PTV_LOGO.png"
              alt="TTCS logo"
              width={65}
              height={65}
              className="sidebar-brand-logo"
              priority
            />
            <div className="sidebar-brand-copy">
              <span>TASK AND</span>
              <span>TELECONFERENCE</span>
              <span>SYSTEM</span>
            </div>
          </div>

          <div className="sidebar-nav">
            {navGroups.map((group) => (
              <div key={group.section}>
                <div className="sidebar-section">{group.section}</div>
                {group.items.map((item) => (
                  <Link
                    key={item.label}
                    className={`sidebar-link${pathname === item.href ? " active" : ""}`}
                    href={item.href}
                  >
                    <span className="sidebar-icon">
                      <SidebarIcon icon={item.icon} />
                    </span>
                    <span>{item.label}</span>
                    {"badge" in item && item.badge ? (
                      <span className="sidebar-badge">{item.badge}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <section className="main-area">
          <div className="content-wrap">
            <div className="main-inner">
              <div className="dashboard-head">
                <div className="dashboard-head-left">
                  <div className="td-title">{title}</div>
                  {subtitle ? <div className="td-sub">{subtitle}</div> : null}
                </div>
              </div>
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
