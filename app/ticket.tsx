import { Eyebrow } from "@/components/ui";
import type { Mission } from "@/lib/languages";

/** Rome's time on a departure board: one split flap per digit. */
function Board({ time }: { time: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Roma</span>
      <span className="sr-only" suppressHydrationWarning>{time}</span>
      <span aria-hidden className="flex items-center gap-0.5 text-sm">
        {[...time].map((c, i) =>
          c === ":" ? (
            <span key={i} className="font-bold">:</span>
          ) : (
            <span key={i} className="flap" suppressHydrationWarning>{c}</span>
          )
        )}
      </span>
    </span>
  );
}

/**
 * Today's call as a ticket. The mission sits above the tear; below it are the phrases
 * she will steer toward, so you know what to reach for before she picks up.
 */
export function Ticket({
  mission,
  phrases,
  time,
  empty,
  lang,
  className = "",
}: {
  mission: Mission;
  phrases: string[];
  time: string;
  /** What to say when nothing is due. */
  empty: string;
  /** The language the phrases are in. */
  lang: string;
  className?: string;
}) {
  return (
    <section aria-label="Today's call" className={`rounded-3xl border border-line bg-card ${className}`}>
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>Today&rsquo;s call</Eyebrow>
          <Board time={time} />
        </div>
        <h2 className="mt-3 text-balance text-xl font-bold leading-snug">{mission.title}</h2>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{mission.why}</p>
      </div>

      {/* The tear: a dashed rule with a notch bitten out of each edge. */}
      <div aria-hidden className="relative">
        <div className="mx-5 border-t-2 border-dashed border-line" />
        <span className="absolute -left-[12.5px] top-1/2 size-6 -translate-y-1/2 rounded-full border border-line bg-ground [clip-path:inset(0_0_0_calc(50%-1px))]" />
        <span className="absolute -right-[12.5px] top-1/2 size-6 -translate-y-1/2 rounded-full border border-line bg-ground [clip-path:inset(0_calc(50%-1px)_0_0)]" />
      </div>

      <div className="px-5 pb-5 pt-4">
        <Eyebrow>Try to say</Eyebrow>
        {phrases.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {phrases.map((p) => (
              <li key={p} lang={lang} className="font-voice text-xl leading-snug">
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 leading-relaxed text-muted">{empty}</p>
        )}
      </div>
    </section>
  );
}
