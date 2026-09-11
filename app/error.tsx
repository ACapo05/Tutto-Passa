"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

/**
 * Next 16 passes `retry`, not `reset`. Errors here are almost always Supabase being
 * unreachable or misconfigured, so the message says that rather than apologising.
 */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-tomato-edge">Could not load</p>
      <h1 className="mt-2 text-2xl font-black text-ink">Your progress could not be read.</h1>
      <p className="mt-3 max-w-md font-semibold leading-relaxed text-muted">
        This is nearly always the database: check NEXT_PUBLIC_SUPABASE_URL and
        SUPABASE_SERVICE_ROLE_KEY in .env.local, and that supabase/schema.sql has been run.
      </p>
      {error.digest && <p className="mt-4 text-xs font-bold text-muted">digest {error.digest}</p>}
      <div className="mt-7">
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </main>
  );
}
