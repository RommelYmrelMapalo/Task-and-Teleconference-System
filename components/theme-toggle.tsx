"use client";

import { useEffect, useRef, useState } from "react";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "ttcs-theme";

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return preference;
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  window.localStorage.setItem(STORAGE_KEY, preference);
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
  });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    applyTheme(preference);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const current = (window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? "light";
      if (current === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      className={`theme-toggle${open ? " open" : ""}`}
      aria-label="Theme mode"
      ref={rootRef}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={`theme-toggle-menu${open ? " open" : ""}`} onClick={(event) => event.stopPropagation()}>
        {(["light", "dark", "system"] as ThemePreference[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`theme-toggle-button${preference === option ? " active" : ""}`}
            onClick={() => {
              setPreference(option);
              applyTheme(option);
              setOpen(false);
            }}
          >
            {option === "light" ? "Light" : option === "dark" ? "Dark" : "System"}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="theme-toggle-trigger"
        aria-expanded={open}
        aria-label="Select theme"
        onClick={() => setOpen((current) => !current)}
      >
        Theme
      </button>
    </div>
  );
}
