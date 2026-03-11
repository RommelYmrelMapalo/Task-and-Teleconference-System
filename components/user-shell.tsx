"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { SidebarIcon } from "./sidebar-icons";

type FlashMessage = {
  id: string;
  category: "success" | "error";
  message: string;
};

type UserNavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "tasks" | "meetings" | "timein" | "timeout" | "inbox";
  badge?: string;
};

const navGroups: Array<{ section: string; items: UserNavItem[] }> = [
  {
    section: "MAIN",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" as const }],
  },
  {
    section: "TASKS",
    items: [{ href: "/tasks", label: "Tasks Dashboard", icon: "tasks" as const }],
  },
  {
    section: "TELECONFERENCE",
    items: [
      { href: "/assigned-meetings", label: "Assigned Meetings", icon: "meetings" as const },
      { href: "/record-timein", label: "Record Time-in", icon: "timein" as const },
      { href: "/record-timeout", label: "Record Time-out", icon: "timeout" as const },
      { href: "/inbox", label: "Inbox", icon: "inbox" as const, badge: "3" },
    ],
  },
];

export function UserShell({
  title,
  subtitle,
  actions,
  flashes,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  flashes?: FlashMessage[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

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
                {group.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.label}
                      className={`sidebar-link${isActive ? " active" : ""}`}
                      href={item.href}
                    >
                      <span className="sidebar-icon">
                        <SidebarIcon icon={item.icon} />
                      </span>
                      <span>{item.label}</span>
                      {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className={`user-box${userMenuOpen ? " open" : ""}`} ref={boxRef}>
              <div className="user-actions">
                <Link className="user-action-link" href="/profile">
                  Settings
                </Link>
                <Link className="user-action-link" href="/login">
                  Logout
                </Link>
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
                  <div className="user-avatar">JS</div>
                  <div>
                    <div className="user-name">Juan Student</div>
                    <div className="user-sub">User</div>
                  </div>
                </div>
                <div className="caret">{userMenuOpen ? "\u25B4" : "\u25BE"}</div>
              </button>
            </div>
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
                {actions ? <div className="planner-actions-top">{actions}</div> : null}
              </div>

              {flashes?.length ? (
                <div className="flash-stack" aria-live="polite" aria-atomic="true">
                  {flashes.map((item) => (
                    <div
                      className={`flash-modern ${item.category === "error" ? "flash-modern-error" : "flash-modern-success"} is-visible`}
                      key={item.id}
                      role="alert"
                    >
                      <div className="flash-modern-content">
                        <span className="flash-modern-dot" />
                        <span>{item.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
