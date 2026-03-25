import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Breadcrumb({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"nav">) {
  return (
    <nav aria-label="Breadcrumb" className={joinClasses("breadcrumb", className)} {...props}>
      {children}
    </nav>
  );
}

export function BreadcrumbList({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol className={joinClasses("breadcrumb-list", className)} {...props}>
      {children}
    </ol>
  );
}

export function BreadcrumbItem({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"li">) {
  return (
    <li className={joinClasses("breadcrumb-item", className)} {...props}>
      {children}
    </li>
  );
}

type BreadcrumbLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: ReactNode;
  };

export function BreadcrumbLink({
  children,
  className,
  ...props
}: BreadcrumbLinkProps) {
  return (
    <Link className={joinClasses("breadcrumb-link", className)} {...props}>
      {children}
    </Link>
  );
}

export function BreadcrumbPage({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-current="page"
      className={joinClasses("breadcrumb-page", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function BreadcrumbSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<"li">) {
  return (
    <li
      aria-hidden="true"
      className={joinClasses("breadcrumb-separator", className)}
      {...props}
    >
      <svg viewBox="0 0 24 24" focusable="false">
        <path
          d="m9 6 6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </svg>
    </li>
  );
}
