"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import type { ShellUser } from "@/lib/ttcs-data";
import { SignOutButton } from "./auth/sign-out-button";
import { SidebarIcon } from "./sidebar-icons";

const SIDEBAR_COLLAPSE_KEY = "ttcs-sidebar-collapsed";
const SIDEBAR_DESKTOP_BREAKPOINT = 1100;

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

function formatDisplayName(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function UserShell({
  title,
  subtitle,
  actions,
  sidebarContent,
  flashes,
  user,
  unreadCount = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  sidebarContent?: ReactNode;
  flashes?: FlashMessage[];
  user: ShellUser;
  unreadCount?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const displayName = formatDisplayName(user.fullName);

  useEffect(() => {
    const syncSidebarPreference = () => {
      if (window.innerWidth <= SIDEBAR_DESKTOP_BREAKPOINT) {
        setSidebarCollapsed(false);
        setMobileSidebarOpen(false);
        return;
      }

      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true");
      setMobileSidebarOpen(false);
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
        setMobileSidebarOpen(false);
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
      <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileSidebarOpen ? " sidebar-mobile-open" : ""}`}>
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
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
                {group.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.label}
                      className={`sidebar-link${isActive ? " active" : ""}`}
                      href={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      onClick={() => setMobileSidebarOpen(false)}
                    >
                      <span className="sidebar-icon">
                        <SidebarIcon icon={item.icon} />
                      </span>
                      <span className="sidebar-link-label">{item.label}</span>
                      {item.icon === "inbox" ? (
                        <span className="sidebar-badge">{unreadCount}</span>
                      ) : item.badge ? (
                        <span className="sidebar-badge">{item.badge}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}

            {sidebarContent ? <div className="sidebar-extra">{sidebarContent}</div> : null}
          </div>

          <div className="sidebar-footer">
            <div className={`user-box${userMenuOpen ? " open" : ""}`} ref={boxRef}>
              <div className="user-actions">
                <Link className="user-action-link" href="/profile">
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
            <div className="main-inner">
              <div className="dashboard-head">
                <div className="dashboard-head-left">
                  <button
                    type="button"
                    className="mobile-sidebar-toggle"
                    aria-label={mobileSidebarOpen ? "Close navigation" : "Open navigation"}
                    aria-expanded={mobileSidebarOpen}
                    onClick={() => {
                      setUserMenuOpen(false);
                      setMobileSidebarOpen((open) => !open);
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {mobileSidebarOpen ? (
                        <path d="M6 6 18 18M18 6 6 18" />
                      ) : (
                        <>
                          <path d="M4 7h16" />
                          <path d="M4 12h16" />
                          <path d="M4 17h16" />
                        </>
                      )}
                    </svg>
                  </button>
                  <PageBreadcrumbs pathname={pathname} title={title} subtitle={subtitle} />
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
