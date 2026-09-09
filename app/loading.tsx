import { Skeleton } from "@/components/ui";

/* Holds the layout still while the notebook loads, instead of a blank screen. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex items-baseline justify-between border-b border-panel-line pb-3">
        <span className="engraved text-[0.65rem] text-brass">Tutto Passa</span>
      </div>
      <div className="mt-6 flex gap-8">
        <Skeleton className="h-11 w-14" />
        <Skeleton className="h-11 w-14" />
        <Skeleton className="h-11 w-14" />
      </div>
      <Skeleton className="mt-10 h-4 w-28" />
      <Skeleton className="mt-4 h-16 w-full" />
      <Skeleton className="mt-10 h-4 w-20" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <span className="sr-only">Sto aprendo il quaderno…</span>
    </main>
  );
}
