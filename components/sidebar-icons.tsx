import type { ReactNode } from "react";

type IconName =
  | "dashboard"
  | "tasks"
  | "meetings"
  | "timein"
  | "timeout"
  | "inbox"
  | "monitoring"
  | "users"
  | "reports"
  | "profile";

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function wrap(children: ReactNode) {
  return (
    <svg {...commonProps} aria-hidden="true">
      {children}
    </svg>
  );
}

export function SidebarIcon({ icon }: { icon: IconName }) {
  switch (icon) {
    case "dashboard":
      return wrap(
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="4.5" rx="1.5" />
          <rect x="14" y="10.5" width="7" height="10.5" rx="1.5" />
          <rect x="3" y="13.5" width="7" height="7.5" rx="1.5" />
        </>,
      );
    case "tasks":
      return wrap(
        <>
          <path d="M9 11l2 2 4-4" />
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </>,
      );
    case "meetings":
      return wrap(
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </>,
      );
    case "timein":
      return wrap(
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </>,
      );
    case "timeout":
      return wrap(
        <>
          <path d="M6 2h12" />
          <path d="M8 2v4l4 4-4 4v4" />
          <path d="M16 2v4l-4 4 4 4v4" />
        </>,
      );
    case "inbox":
      return wrap(
        <>
          <path d="M4 6h16l-1.5 11H5.5L4 6z" />
          <path d="M8 11h8l-1 3h-6l-1-3z" />
        </>,
      );
    case "monitoring":
      return wrap(
        <>
          <path d="M4 13h3l2-4 4 8 2-4h5" />
          <path d="M4 5h16v14H4z" />
        </>,
      );
    case "users":
      return wrap(
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 4.13a3 3 0 0 1 0 5.74" />
        </>,
      );
    case "reports":
      return wrap(
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z" />
          <path d="M14 2v6h6" />
        </>,
      );
    case "profile":
      return wrap(
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </>,
      );
  }
}
