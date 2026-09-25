import type { StoredCard } from "@/lib/srs";

/** What the review screen shows for one card, whichever kind of item it came from. */
export type ReviewCard = {
  id: string;
  label: string;
  prompt: string;
  promptIsTarget: boolean;
  /** The prompt is something you said wrong: shown muted, never as a model. */
  promptIsWrong: boolean;
  answer: string;
  answerIsTarget: boolean;
  note: string | null;
  /** The new word, underlined wherever the side in the language shows it. */
  word: string | null;
  isNew: boolean;
  fsrs: StoredCard | null;
};

export type CardRow = {
  id: string;
  kind: string;
  item_key: string;
  correct_form: string | null;
  you_said: string | null;
  note: string | null;
  /** direction is "<code>-en" (meet the word) or "en-<code>" (produce it). */
  card: { word: string; gloss: string; direction: string } | null;
  fsrs: StoredCard | null;
};

export const CARD_COLUMNS = "id, kind, item_key, correct_form, you_said, note, card, fsrs";

/** `label` is the language in English, for the prompt, e.g. "Say it in Spanish". */
export function toReviewCard(row: CardRow, label: string): ReviewCard {
  const base = { id: row.id, isNew: !row.fsrs || row.fsrs.state === 0, fsrs: row.fsrs, promptIsWrong: false };

  // Deck: the same sentence both ways. You meet the word in the language first, then produce it.
  if (row.kind === "deck" && row.card) {
    const sentence = row.correct_form ?? "";
    const english = row.note ?? "";
    return row.card.direction.endsWith("-en")
      ? { ...base, label: "What does it mean?", prompt: sentence, promptIsTarget: true, answer: english, answerIsTarget: false, note: row.card.gloss, word: row.card.word }
      : { ...base, label: `Say it in ${label}`, prompt: english, promptIsTarget: false, answer: sentence, answerIsTarget: true, note: row.card.gloss, word: row.card.word };
  }

  if (row.kind === "vocab") {
    return { ...base, label: `Say it in ${label}`, prompt: row.note ?? "(no meaning saved)", promptIsTarget: false, answer: row.correct_form ?? row.item_key, answerIsTarget: true, note: null, word: null };
  }

  // A mistake from a call: fix what you said.
  return {
    ...base,
    label: "Say it correctly",
    prompt: row.you_said ?? row.note ?? "",
    promptIsTarget: Boolean(row.you_said),
    promptIsWrong: Boolean(row.you_said),
    answer: row.correct_form ?? row.item_key,
    answerIsTarget: true,
    note: row.you_said ? row.note : null,
    word: null,
  };
}
