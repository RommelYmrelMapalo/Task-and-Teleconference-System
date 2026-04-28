"use client";

import Link from "next/link";
import { useEffect } from "react";

function normalizeErrorMessage(error: Error & { digest?: string }) {
  const message = error.message?.trim();

  if (!message || message === "Failed to fetch RSC payload.") {
    return "Something went wrong while loading this page.";
  }

  return message;
}

export function AppErrorView({
  error,
  reset,
  scope = "page",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  scope?: "page" | "app";
}) {
  const message = normalizeErrorMessage(error);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="app-error-shell">
      <section className="app-error-card" role="alert" aria-live="assertive">
        <div className="app-error-badge">{scope === "app" ? "System error" : "Page error"}</div>
        <h1>We couldn&apos;t load this screen.</h1>
        <p className="app-error-copy">
          The app hit an error while rendering this page. You can try again or return to the home screen.
        </p>
        <div className="app-error-message">{message}</div>
        <div className="app-error-actions">
          <button type="button" className="app-error-button app-error-button-primary" onClick={() => reset()}>
            Try again
          </button>
          <button type="button" className="app-error-button" onClick={() => window.location.reload()}>
            Reload app
          </button>
          <Link href="/" className="app-error-link">
            Back to login
          </Link>
        </div>
        {error.digest ? <div className="app-error-meta">Reference: {error.digest}</div> : null}
      </section>
    </main>
  );
}
