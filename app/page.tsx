import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/srs";
import { streak } from "@/lib/stats";
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
};

export type Past = {
  id: string;
  created_at: string;
  duration_secs: number | null;
  memory: string | null;
};

/**
 * The notebook is the page. Everything the review system knows is readable between calls;
 * the call itself is the brass bar pinned to the bottom.
 */
export default async function Page() {
  const today = toDateString(new Date());

  const [{ data: items }, { data: past }] = await Promise.all([
    supabase
      .from("items")
      .select("id, kind, item_key, correct_form, you_said, note, next_due, interval_days, recurrence_count")
      .eq("language", "it")
      .order("recurrence_count", { ascending: false })
      .order("next_due", { ascending: true }),
    supabase
      .from("sessions")
      .select("id, created_at, duration_secs, memory")
      .eq("language", "it")
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  const all = (items ?? []) as Item[];
  const sessions = (past ?? []) as Past[];

  return (
    <Quaderno
      due={all.filter((i) => i.next_due <= today)}
      later={all.filter((i) => i.next_due > today)}
      past={sessions.slice(0, 8)}
      memory={sessions.find((p) => p.memory)?.memory ?? null}
      stats={{
        streak: streak(sessions.map((s) => toDateString(new Date(s.created_at)))),
        tracked: all.length,
        minutes: Math.round(sessions.reduce((n, s) => n + (s.duration_secs ?? 0), 0) / 60),
      }}
    />
  );
}
