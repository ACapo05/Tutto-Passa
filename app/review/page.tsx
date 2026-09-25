import { supabase } from "@/lib/supabase";
import { toDateString } from "@/lib/srs";
import { NEW_WORDS_PER_DAY } from "@/lib/deck";
import { CARD_COLUMNS, toReviewCard, type CardRow } from "./cards";
import { ReviewSession } from "./session";
import { currentProfile } from "@/lib/current-language";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review · Tutto Passa" };

/**
 * Flashcards due today: deck words, words saved in calls, and mistakes from calls. Today's new
 * deck words are written when the session opens and join the end of the queue.
 */
export default async function ReviewPage() {
  const profile = await currentProfile();
  const today = toDateString(new Date());
  const [due, introduced] = await Promise.all([
    supabase
      .from("items")
      .select(CARD_COLUMNS)
      .eq("language", profile.code)
      .lte("next_due", today)
      .order("recurrence_count", { ascending: false })
      .limit(200),
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("language", profile.code)
      .eq("kind", "deck")
      .eq("first_seen", today)
      .like("item_key", `%:en-${profile.code}`),
  ]);
  const error = due.error ?? introduced.error;

  // Reviews before new cards, as Anki does; among new cards, meet a word in the language before producing it.
  const cards = ((due.data ?? []) as CardRow[])
    .map((row) => toReviewCard(row, profile.label))
    .sort((a, b) => Number(a.isNew) - Number(b.isNew) || Number(!a.promptIsTarget) - Number(!b.promptIsTarget));
  const newWordsLeft = Math.max(0, NEW_WORDS_PER_DAY - (introduced.count ?? 0));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      {error ? (
        <p role="alert" className="mt-10 rounded-2xl border border-tomato bg-tomato-soft px-4 py-3 font-semibold text-tomato-ink">
          Flashcards could not load: {error.message}. If it mentions fsrs, card or deck_state, run the new lines in
          supabase/schema.sql.
        </p>
      ) : (
        <ReviewSession cards={cards} newWordsLeft={newWordsLeft} />
      )}
    </main>
  );
}
