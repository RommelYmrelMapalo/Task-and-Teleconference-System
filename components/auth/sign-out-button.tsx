"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/utils/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      className={className}
      type="button"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      Logout
    </button>
  );
}
