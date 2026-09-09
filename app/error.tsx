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
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-5">
      <p className="engraved text-[0.62rem] text-sienna">Quaderno chiuso</p>
      <h1 className="mt-3 font-display text-2xl leading-snug text-plaster">
        Il quaderno non si apre.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-sage">
        The notebook could not be read. This is nearly always the database: check
        NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, and that
        supabase/schema.sql has been run.
      </p>
      {error.digest && (
        <p className="engraved mt-4 text-[0.55rem] text-sage">digest {error.digest}</p>
      )}
      <div className="mt-7">
        <Button onClick={() => retry()}>Riprova</Button>
      </div>
    </main>
  );
}
