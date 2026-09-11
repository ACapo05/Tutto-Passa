import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/srs";
import { LISTENING_MINUTES_PER_WEEK, daysIntoPlan, listeningLevel, whereInPlan } from "@/lib/plan";
import { SHOWS, parseFeed, pickEpisodes, type Episode } from "@/lib/podcasts";
import { STORY_COLUMNS, toStory, type StoryRow } from "./story";
import { ListenHub } from "./hub";

export const dynamic = "force-dynamic";
export const metadata = { title: "Listen · Tutto Passa" };

/* ponytail: feeds are fetched on every visit; cache them for a few hours if the page feels slow. */
async function episodesFor(showId: string): Promise<Episode[]> {
  try {
    const res = await fetch(SHOWS[showId].feed, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "TuttoPassa/1.0 (podcast reader)" },
    });
    if (!res.ok) return [];
    return pickEpisodes(SHOWS[showId], parseFeed(await res.text()));
  } catch {
    return []; // A show that is down should not take the page with it.
  }
}

/**
 * The listening hub: a story written and recorded for today's level, real podcasts for the
 * same level, and the week's listening minutes. The level steps up every 30 days.
 */
export default async function ListenPage() {
  const today = toDateString(new Date());
  const days = daysIntoPlan(today);
  const level = listeningLevel(today);
  const plan = whereInPlan(today);

  const [story, habits, episodes] = await Promise.all([
    supabase.from("stories").select(STORY_COLUMNS).eq("language", "it").eq("day", today).maybeSingle(),
    supabase.from("habits").select("day, listening_minutes").gte("day", plan.weekStart),
    Promise.all(level.shows.map(episodesFor)),
  ]);
  const week = (habits.data ?? []) as { day: string; listening_minutes: number }[];

  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-44 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <ListenHub
        month={level.month}
        cefr={level.cefr}
        daysToNext={level.month === 12 ? null : 30 - (days % 30)}
        story={story.data ? toStory(story.data as StoryRow) : null}
        storyProblem={story.error ? `${story.error.message}. Run the stories table from supabase/schema.sql.` : null}
        shows={level.shows.map((id, i) => ({ id, name: SHOWS[id].name, by: SHOWS[id].by, about: SHOWS[id].about, episodes: episodes[i] }))}
        listenedToday={week.find((h) => h.day === today)?.listening_minutes ?? 0}
        listenedWeek={week.reduce((n, h) => n + (h.listening_minutes ?? 0), 0)}
        weeklyTarget={LISTENING_MINUTES_PER_WEEK}
      />
    </main>
  );
}
