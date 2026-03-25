import { createClient } from "@/app/utils/utils/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

async function InstrumentsData() {
  const supabase = await createClient();
  const { data: instruments } = await supabase.from("instruments").select();

  return <pre>{JSON.stringify(instruments, null, 2)}</pre>;
}

export default function Instruments() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-80" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      }
    >
      <InstrumentsData />
    </Suspense>
  );
}
