"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import type { ShellUser } from "@/lib/ttcs-data";
import { SignOutButton } from "./auth/sign-out-button";
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
      { href: "/admin/inbox", label: "Inbox", icon: "inbox" as const, badge: "6" },
    ],
  },
];

function formatDisplayName(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function AdminShell({
  title,
  subtitle,
  actions,
  user,
  unreadCount = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  user: ShellUser;
  unreadCount?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const displayName = formatDisplayName(user.fullName);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!boxRef.current?.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
                    {item.href === "/admin/inbox" ? (
                      <span className="sidebar-badge">{unreadCount}</span>
                    ) : "badge" in item && item.badge ? (
                      <span className="sidebar-badge">{item.badge}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className={`user-box${userMenuOpen ? " open" : ""}`} ref={boxRef}>
              <div className="user-actions">
                <Link className="user-action-link" href="/admin/profile">
                  Settings
                </Link>
                <SignOutButton className="user-action-link" />
              </div>

              <button
                className="user-trigger"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setUserMenuOpen((open) => !open);
                }}
              >
                <div className="user-row">
                  <div className="user-avatar">{user.initials}</div>
                  <div>
                    <div className="user-name">{displayName}</div>
                    <div className="user-sub">{user.roleLabel}</div>
                  </div>
                </div>
                <div className="caret">{userMenuOpen ? "\u25B4" : "\u25BE"}</div>
              </button>
            </div>
          </div>
        </aside>

        <section className="main-area">
          <div className="content-wrap">
            <div className="main-inner admin-main-inner">
              <div className="dashboard-head">
                <div className="dashboard-head-left">
                  <div className="td-title">{title}</div>
                  {subtitle ? <div className="td-sub">{subtitle}</div> : null}
                </div>
                {actions ? <div className="planner-actions-top">{actions}</div> : null}
              </div>
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
