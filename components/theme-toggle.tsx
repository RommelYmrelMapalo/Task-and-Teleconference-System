"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "ttcs-theme";
const THEME_EVENT = "ttcs-theme-change";

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return preference;
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolveTheme(preference);
  window.localStorage.setItem(STORAGE_KEY, preference);
  window.dispatchEvent(new Event(THEME_EVENT));
}

function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const currentPreference = document.documentElement.dataset.themePreference;
  if (currentPreference === "light" || currentPreference === "dark" || currentPreference === "system") {
    return currentPreference;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function subscribeToThemePreference(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const handleThemeChange = () => callback();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };
  const handleMediaChange = () => {
    if (readThemePreference() === "system") {
      applyTheme("system");
      return;
    }

    callback();
  };

  window.addEventListener(THEME_EVENT, handleThemeChange);
  window.addEventListener("storage", handleStorage);
  media.addEventListener("change", handleMediaChange);

  return () => {
    window.removeEventListener(THEME_EVENT, handleThemeChange);
    window.removeEventListener("storage", handleStorage);
    media.removeEventListener("change", handleMediaChange);
  };
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    () => "system",
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
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

  function selectTheme(nextPreference: ThemePreference) {
    applyTheme(nextPreference);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`theme-toggle${open ? " open" : ""}`}
      aria-label="Theme mode"
      onClick={(event) => event.stopPropagation()}
    >
      <div className={`theme-toggle-menu${open ? " open" : ""}`}>
        <button
          type="button"
          className={`theme-toggle-button${preference === "light" ? " active" : ""}`}
          aria-pressed={preference === "light"}
          aria-label="Use light theme"
          onClick={() => selectTheme("light")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" fill="currentColor" />
            <path
              d="M12 2.5v3M12 18.5v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2.5 12h3M18.5 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
            />
          </svg>
        </button>
        <button
          type="button"
          className={`theme-toggle-button${preference === "dark" ? " active" : ""}`}
          aria-pressed={preference === "dark"}
          aria-label="Use dark theme"
          onClick={() => selectTheme("dark")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15.2 2.8a1 1 0 0 0-1.32 1.17 8.1 8.1 0 1 1-9.9 9.9 1 1 0 0 0-1.17 1.32A10.2 10.2 0 1 0 15.2 2.8Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <button
          type="button"
          className={`theme-toggle-button${preference === "system" ? " active" : ""}`}
          aria-pressed={preference === "system"}
          aria-label="Use system theme"
          onClick={() => selectTheme("system")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="10.5" rx="2" fill="none" stroke="currentColor" strokeWidth="2.1" />
            <path d="M9.2 19h5.6M12 15.5V19" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.1" />
            <path d="M7.5 8.5h9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.1" opacity="0.9" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className="theme-toggle-trigger"
        aria-expanded={open}
        aria-label="Open theme options"
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 640 640" aria-hidden="true">
          <path d="M512 320C512 214 426 128 320 128L320 512C426 512 512 426 512 320zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320z" />
        </svg>
      </button>
    </div>
  );
}
