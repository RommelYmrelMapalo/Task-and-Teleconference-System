"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import type { ShellUser } from "@/lib/ttcs-data";
import { SignOutButton } from "./auth/sign-out-button";
import { SidebarIcon } from "./sidebar-icons";

const SIDEBAR_COLLAPSE_KEY = "ttcs-sidebar-collapsed";
const SIDEBAR_DESKTOP_BREAKPOINT = 1100;

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
  contentClassName,
  sidebarContent,
  user,
  unreadCount = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  contentClassName?: string;
  sidebarContent?: ReactNode;
  user: ShellUser;
  unreadCount?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const displayName = formatDisplayName(user.fullName);

  useEffect(() => {
    const syncSidebarPreference = () => {
      if (window.innerWidth <= SIDEBAR_DESKTOP_BREAKPOINT) {
        setSidebarCollapsed(false);
        return;
      }

      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true");
    };

    syncSidebarPreference();
    window.addEventListener("resize", syncSidebarPreference);

    return () => {
      window.removeEventListener("resize", syncSidebarPreference);
    };
  }, []);

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
      <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside className={`sidebar-dark${sidebarCollapsed ? " is-collapsed" : ""}`}>
          <div className="sidebar-brand">
            <div className="sidebar-brand-main">
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

            <button
              type="button"
              className="sidebar-collapse-toggle"
              aria-label={sidebarCollapsed ? "Expand side navigation" : "Collapse side navigation"}
              aria-pressed={sidebarCollapsed}
              onClick={() => {
                if (window.innerWidth <= SIDEBAR_DESKTOP_BREAKPOINT) {
                  return;
                }

                setUserMenuOpen(false);
                setSidebarCollapsed((current) => {
                  const next = !current;
                  window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(next));
                  return next;
                });
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {sidebarCollapsed ? (
                  <>
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
                    <rect x="15.25" y="6.75" width="2.75" height="10.5" rx="1.1" fill="currentColor" opacity="0.35" stroke="none" />
                    <path d="M7.75 12h5.5" />
                    <path d="m10.75 9.25 2.75 2.75-2.75 2.75" />
                  </>
                ) : (
                  <>
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
                    <rect x="6" y="6.75" width="2.75" height="10.5" rx="1.1" fill="currentColor" opacity="0.35" stroke="none" />
                    <path d="M10.75 12h5.5" />
                    <path d="m13.75 9.25-2.75 2.75 2.75 2.75" />
                  </>
                )}
              </svg>
            </button>
          </div>

          <div className="sidebar-nav">
            {navGroups.map((group) => (
              <div key={group.section} className="sidebar-group">
                <div className="sidebar-section">{group.section}</div>
                {group.items.map((item) => (
                  <Link
                    key={item.label}
                    className={`sidebar-link${pathname === item.href ? " active" : ""}`}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="sidebar-icon">
                      <SidebarIcon icon={item.icon} />
                    </span>
                    <span className="sidebar-link-label">{item.label}</span>
                    {item.href === "/admin/inbox" ? (
                      <span className="sidebar-badge">{unreadCount}</span>
                    ) : "badge" in item && item.badge ? (
                      <span className="sidebar-badge">{item.badge}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ))}

            {sidebarContent ? <div className="sidebar-extra">{sidebarContent}</div> : null}
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
            <div className={`main-inner admin-main-inner${contentClassName ? ` ${contentClassName}` : ""}`}>
              {title || subtitle || actions ? (
                <div className="dashboard-head">
                  <div className="dashboard-head-left">
                    {title ? <div className="td-title">{title}</div> : null}
                    {subtitle ? <div className="td-sub">{subtitle}</div> : null}
                  </div>
                  {actions ? <div className="planner-actions-top">{actions}</div> : null}
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
