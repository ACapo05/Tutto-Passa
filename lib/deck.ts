/**
 * The built-in deck: words in frequency order, written into short sentences at the learner's
 * level, each learned in both directions. No imports, so node --test can load it directly.
 */

/** New words a day. Each becomes two cards (Italian to English, then English to Italian), so 10 new cards. */
export const NEW_WORDS_PER_DAY = 5;

/** Candidates offered at once: enough that a few skipped names or fillers still leave a full day. */
export const CANDIDATES = 12;

export type DeckResult = { form: string; skip: boolean; italian: string; english: string; gloss: string };

/**
 * Takes the first `wanted` usable results in frequency order. `consumed` is how far through the
 * candidates that went, skips included, so the next batch starts right after the last word used.
 */
export function pickCards(candidates: string[], results: DeckResult[], wanted: number) {
  const chosen: DeckResult[] = [];
  let consumed = 0;
  for (let i = 0; i < candidates.length && chosen.length < wanted; i++) {
    const result = results.find((r) => r.form === candidates[i]) ?? results[i];
    consumed = i + 1;
    if (!result || result.skip || !result.italian.trim() || !result.english.trim()) continue;
    chosen.push({ ...result, form: candidates[i] });
  }
  return { chosen, consumed };
}
