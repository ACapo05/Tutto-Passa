import { Skeleton } from "@/components/ui";

/* Holds Home's shape still while it loads, instead of a blank screen. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <span className="text-lg font-extrabold tracking-tight text-basil-ink">tutto passa</span>
      <div className="mt-8 flex items-center gap-5">
        <Skeleton className="size-24 shrink-0 rounded-full! sm:size-28" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="mt-7 h-52 w-full rounded-3xl!" />
      <Skeleton className="mt-12 h-6 w-52" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <span className="sr-only">Loading…</span>
    </main>
  );
}
