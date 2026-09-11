import type { StoredCard } from "@/lib/srs";

/** What the review screen shows for one card, whichever kind of item it came from. */
export type ReviewCard = {
  id: string;
  label: string;
  prompt: string;
  promptIsItalian: boolean;
  /** The prompt is something you said wrong: shown muted, never as a model. */
  promptIsWrong: boolean;
  answer: string;
  answerIsItalian: boolean;
  note: string | null;
  /** The new word, underlined wherever the Italian side shows it. */
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
  card: { word: string; gloss: string; direction: "it-en" | "en-it" } | null;
  fsrs: StoredCard | null;
};

export const CARD_COLUMNS = "id, kind, item_key, correct_form, you_said, note, card, fsrs";

export function toReviewCard(row: CardRow): ReviewCard {
  const base = { id: row.id, isNew: !row.fsrs || row.fsrs.state === 0, fsrs: row.fsrs, promptIsWrong: false };

  // Deck: the same sentence both ways. You meet the word in Italian first, then produce it.
  if (row.kind === "deck" && row.card) {
    const italian = row.correct_form ?? "";
    const english = row.note ?? "";
    return row.card.direction === "it-en"
      ? { ...base, label: "What does it mean?", prompt: italian, promptIsItalian: true, answer: english, answerIsItalian: false, note: row.card.gloss, word: row.card.word }
      : { ...base, label: "Say it in Italian", prompt: english, promptIsItalian: false, answer: italian, answerIsItalian: true, note: row.card.gloss, word: row.card.word };
  }

  if (row.kind === "vocab") {
    return { ...base, label: "Say it in Italian", prompt: row.note ?? "(no meaning saved)", promptIsItalian: false, answer: row.correct_form ?? row.item_key, answerIsItalian: true, note: null, word: null };
  }

  // A mistake from a call: fix what you said.
  return {
    ...base,
    label: "Say it correctly",
    prompt: row.you_said ?? row.note ?? "",
    promptIsItalian: Boolean(row.you_said),
    promptIsWrong: Boolean(row.you_said),
    answer: row.correct_form ?? row.item_key,
    answerIsItalian: true,
    note: row.you_said ? row.note : null,
    word: null,
  };
}
