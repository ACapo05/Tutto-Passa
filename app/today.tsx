import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { LISTENING_MINUTES_PER_WEEK, WEEKS } from "@/lib/plan";

export type PlanView = {
  week: number;
  phaseName: string;
  phaseSummary: string;
  grammar: string[];
  focusIndex: number;
  wordTarget: number;
  wordsSaved: number;
  deckWords: number;
};

export type TodayView = {
  /** False until the habits table exists. Speaking and flashcards still count without it. */
  available: boolean;
  spoke: boolean;
  cardsDue: number;
  /** Deck words not yet introduced today. They are written when the review session opens. */
  newWordsLeft: number;
  listening: number;
  listeningWeek: number;
};

const DAILY_LISTENING = Math.round(LISTENING_MINUTES_PER_WEEK / 7);

/** Where you are in the year, in one line. Open it for the phase and its grammar in order. */
export function PlanLine({ plan }: { plan: PlanView }) {
  return (
    <details className="group mt-6 border-y border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm text-muted">
            Week {plan.week} of {WEEKS} · {plan.phaseName}
          </span>
          <span className="block font-semibold">This week: {plan.grammar[plan.focusIndex]}</span>
        </span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
        >
          <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="pb-4">
        <p className="text-[0.95rem] leading-relaxed text-muted">{plan.phaseSummary}</p>
        <ol className="mt-3 space-y-2">
          {plan.grammar.map((g, i) => (
            <li key={g} className="flex items-center gap-3" aria-current={i === plan.focusIndex ? "step" : undefined}>
              <span
                aria-hidden
                className={`size-2.5 shrink-0 rounded-full ${
                  i < plan.focusIndex ? "bg-basil" : i === plan.focusIndex ? "bg-card ring-2 ring-basil" : "bg-line"
                }`}
              />
              <span className={i === plan.focusIndex ? "font-semibold" : i < plan.focusIndex ? "text-muted" : ""}>
                {g}
                {i < plan.focusIndex && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {plan.deckWords} {plan.deckWords === 1 ? "word" : "words"} from your deck and {plan.wordsSaved} saved from calls.
          The plan aims for about{" "}
          {plan.wordTarget.toLocaleString("en-GB")} known words by the end of this phase.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Keep one session a week with a human tutor. Giulia can&rsquo;t check your pronunciation.
        </p>
      </div>
    </details>
  );
}

function Check({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      data-done={done || undefined}
      className={`check grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200 motion-reduce:transition-none ${
        done ? "border-basil bg-basil text-card" : "border-line text-transparent"
      }`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5">
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * The plan's three non-negotiables for today, each filled in from what you actually did: a call,
 * your flashcards, and minutes played on the Listening page (or added there by hand).
 */
export function DailyThree({ today }: { today: TodayView }) {
  const reviewed = today.cardsDue === 0 && today.newWordsLeft === 0;
  const listened = today.listening >= DAILY_LISTENING;
  const done = [today.spoke, reviewed, listened].filter(Boolean).length;

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Today&rsquo;s three</h2>
        <span className={`text-sm font-semibold tabular-nums ${done === 3 ? "text-basil-ink" : "text-muted"}`}>
          {done === 3 ? "All three done" : `${done} of 3`}
        </span>
      </div>
      <ul className="mt-1 divide-y divide-line">
        <li className="flex items-center gap-3 py-3">
          <Check done={today.spoke} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Speak out loud</p>
            <p className="text-sm text-muted">{today.spoke ? "Done. You called Giulia today." : "Counts when you call Giulia."}</p>
          </div>
        </li>
        <li className="flex items-center gap-3 py-3">
          <Check done={reviewed} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Flashcards</p>
            <p className="text-sm text-muted">
              {today.cardsDue > 0
                ? `${today.cardsDue} due${today.newWordsLeft ? `, plus ${today.newWordsLeft} new words` : ""}. Say each one out loud.`
                : today.newWordsLeft > 0
                  ? `${today.newWordsLeft} new ${today.newWordsLeft === 1 ? "word" : "words"} waiting.`
                  : "Done for today."}
            </p>
          </div>
          {!reviewed && (
            <Link href="/review" className={`${buttonClass("secondary", "sm")} shrink-0`}>
              Review
            </Link>
          )}
        </li>
        <li className="flex items-center gap-3 py-3">
          <Check done={listened} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Listening</p>
            <p className="text-sm tabular-nums text-muted">
              {today.listening} min today, {today.listeningWeek} of {LISTENING_MINUTES_PER_WEEK} this week
            </p>
          </div>
          <Link href="/listen" className={`${buttonClass(listened ? "secondary" : "primary", "sm")} shrink-0`}>
            Listen
          </Link>
        </li>
      </ul>
      {!today.available && (
        <p className="mt-1 text-sm text-muted">To track listening, run the habits table from supabase/schema.sql once.</p>
      )}
    </section>
  );
}
