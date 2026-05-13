import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbEntry = {
  label: string;
  href?: string;
};

const routeBreadcrumbs: Record<string, BreadcrumbEntry[]> = {
  "/": [
    { label: "Home", href: "/" },
    { label: "User Login" },
  ],
  "/sign-up": [
    { label: "Home", href: "/" },
    { label: "Sign Up" },
  ],
  "/admin/login": [
    { label: "Home", href: "/" },
    { label: "Admin Login" },
  ],
  "/dashboard": [
    { label: "Home", href: "/dashboard" },
    { label: "Dashboard" },
  ],
  "/tasks": [
    { label: "Home", href: "/dashboard" },
    { label: "Tasks Dashboard" },
  ],
  "/meetings": [
    { label: "Home", href: "/dashboard" },
    { label: "Manage Meetings" },
  ],
  "/assigned-meetings": [
    { label: "Home", href: "/dashboard" },
    { label: "Assigned Meetings" },
  ],
  "/record-timein": [
    { label: "Home", href: "/dashboard" },
    { label: "Meeting Attendance" },
  ],
  "/record-timeout": [
    { label: "Home", href: "/dashboard" },
    { label: "Meeting Attendance" },
  ],
  "/inbox": [
    { label: "Home", href: "/dashboard" },
    { label: "Inbox" },
  ],
  "/profile": [
    { label: "Home", href: "/dashboard" },
    { label: "Profile" },
  ],
  "/shared-task": [
    { label: "Home", href: "/dashboard" },
    { label: "Shared Task" },
  ],
  "/admin": [
    { label: "Admin", href: "/admin" },
    { label: "Dashboard" },
  ],
  "/admin/tasks": [
    { label: "Admin", href: "/admin" },
    { label: "Manage Tasks" },
  ],
  "/admin/meetings": [
    { label: "Admin", href: "/admin" },
    { label: "Manage Meetings" },
  ],
  "/admin/record-timein": [
    { label: "Admin", href: "/admin" },
    { label: "Meeting Attendance" },
  ],
  "/admin/record-timeout": [
    { label: "Admin", href: "/admin" },
    { label: "Meeting Attendance" },
  ],
  "/admin/monitoring": [
    { label: "Admin", href: "/admin" },
    { label: "Monitoring Panel" },
  ],
  "/admin/users": [
    { label: "Admin", href: "/admin" },
    { label: "Manage Users" },
  ],
  "/admin/inbox": [
    { label: "Admin", href: "/admin" },
    { label: "Inbox" },
  ],
  "/admin/profile": [
    { label: "Admin", href: "/admin" },
    { label: "Profile" },
  ],
};

function toTitleCase(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildFallbackBreadcrumbs(pathname: string, title?: string) {
  const currentLabel = title?.trim();

  if (pathname.startsWith("/admin/")) {
    const segment = pathname.split("/").filter(Boolean).at(-1);
    return [
      { label: "Admin", href: "/admin" },
      { label: currentLabel || toTitleCase(segment ?? "Page") },
    ];
  }

  if (pathname !== "/" && pathname.startsWith("/")) {
    const segment = pathname.split("/").filter(Boolean).at(-1);
    return [
      { label: "Home", href: "/dashboard" },
      { label: currentLabel || toTitleCase(segment ?? "Page") },
    ];
  }

  return [{ label: currentLabel || "Page" }];
}

export function PageBreadcrumbs({
  pathname,
  title,
  subtitle,
  centered = false,
}: {
  pathname: string;
  title?: string;
  subtitle?: string;
  centered?: boolean;
}) {
  const items = routeBreadcrumbs[pathname] ?? buildFallbackBreadcrumbs(pathname, title);

  return (
    <div className={`page-breadcrumbs-shell${centered ? " is-centered" : ""}`}>
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, index) => (
            <Fragment key={`${item.label}:${item.href ?? "current"}:${index}`}>
              <BreadcrumbItem>
                {item.href && index < items.length - 1 ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < items.length - 1 ? <BreadcrumbSeparator /> : null}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {subtitle ? <p className="page-breadcrumbs-subtitle">{subtitle}</p> : null}
    </div>
  );
}
