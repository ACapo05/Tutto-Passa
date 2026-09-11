import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/srs";
import { streak } from "@/lib/stats";
import { getProfile, type Mission } from "@/lib/languages";
import { whereInPlan } from "@/lib/plan";
import { NEW_WORDS_PER_DAY } from "@/lib/deck";
import { Quaderno } from "./quaderno";

export const dynamic = "force-dynamic";

export type Item = {
  id: string;
  kind: string;
  item_key: string;
  correct_form: string | null;
  you_said: string | null;
  note: string | null;
  next_due: string;
  interval_days: number;
  recurrence_count: number;
  first_seen: string | null;
  /** Days until due, for items not due yet. */
  days?: number;
};

export type Past = {
  id: string;
  created_at: string;
  duration_secs: number | null;
  memory: string | null;
  next_mission: Mission | null;
};

type Habit = { day: string; listening_minutes: number };

const DAY_MS = 86_400_000;

/**
 * Home is Giulia, where you are in the year, today's mission and the plan's daily three, then
 * what the review system knows. The call itself takes over the whole screen.
 */
export default async function Page() {
  const today = toDateString(new Date());
  const plan = whereInPlan(today);

  const [{ data: items }, { data: past }, habits] = await Promise.all([
    supabase
      .from("items")
      .select("id, kind, item_key, correct_form, you_said, note, next_due, interval_days, recurrence_count, first_seen")
      .eq("language", "it")
      .order("recurrence_count", { ascending: false })
      .order("next_due", { ascending: true }),
    supabase
      .from("sessions")
      .select("id, created_at, duration_secs, memory, next_mission:report->next_mission")
      .eq("language", "it")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase.from("habits").select("day, listening_minutes").gte("day", plan.weekStart),
  ]);

  const all = (items ?? []) as Item[];
  const due = all.filter((i) => i.next_due <= today);
  // Deck cards live on /review only. The call lists show what came out of calls.
  const fromCalls = all.filter((i) => i.kind !== "deck");
  const deckWords = all.filter((i) => i.kind === "deck" && i.item_key.endsWith(":en-it"));
  const sessions = (past ?? []) as Past[];
  const week = (habits.data ?? []) as Habit[];
  const todays = week.find((h) => h.day === today);

  return (
    <Quaderno
      due={fromCalls.filter((i) => i.next_due <= today)}
      later={fromCalls
        .filter((i) => i.next_due > today)
        .map((i) => ({ ...i, days: Math.round((Date.parse(i.next_due) - Date.parse(today)) / DAY_MS) }))}
      past={sessions.slice(0, 8)}
      memory={sessions.find((p) => p.memory)?.memory ?? null}
      mission={sessions[0]?.next_mission ?? getProfile("it").starterMission}
      stats={{
        streak: streak(sessions.map((s) => toDateString(new Date(s.created_at)))),
        tracked: fromCalls.length,
        minutes: Math.round(sessions.reduce((n, s) => n + (s.duration_secs ?? 0), 0) / 60),
      }}
      plan={{
        week: plan.week,
        phaseName: plan.phase.name,
        phaseSummary: plan.phase.summary,
        grammar: plan.phase.grammar,
        focusIndex: plan.focusIndex,
        wordTarget: plan.phase.wordTarget,
        wordsSaved: all.filter((i) => i.kind === "vocab").length,
        deckWords: deckWords.length,
      }}
      today={{
        available: !habits.error,
        spoke: sessions.some((s) => toDateString(new Date(s.created_at)) === today),
        cardsDue: due.length,
        newWordsLeft: Math.max(0, NEW_WORDS_PER_DAY - deckWords.filter((i) => i.first_seen === today).length),
        listening: todays?.listening_minutes ?? 0,
        listeningWeek: week.reduce((n, h) => n + (h.listening_minutes ?? 0), 0),
      }}
    />
  );
}
