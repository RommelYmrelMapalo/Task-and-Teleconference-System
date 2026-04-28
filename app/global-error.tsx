"use client";

import "./globals.css";
import { AppErrorView } from "@/components/app-error-view";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <AppErrorView error={error} reset={reset} scope="app" />
      </body>
    </html>
  );
}
