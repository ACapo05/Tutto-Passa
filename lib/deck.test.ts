import { test } from "node:test";
import assert from "node:assert/strict";
import { pickCards, type DeckResult } from "./deck.ts";

const card = (form: string): DeckResult => ({ form, skip: false, italian: `Frase con ${form}.`, english: `Sentence with ${form}.`, gloss: form });
const skipped = (form: string): DeckResult => ({ form, skip: true, italian: "", english: "", gloss: "" });

test("takes words in frequency order and stops at the day's limit", () => {
  const { chosen, consumed } = pickCards(["e", "non", "che", "di"], ["e", "non", "che", "di"].map(card), 2);
  assert.deepEqual(chosen.map((c) => c.form), ["e", "non"]);
  assert.equal(consumed, 2);
});

test("skipped words are used up, so they are not offered again", () => {
  const { chosen, consumed } = pickCards(["marco", "ok", "casa", "via"], [skipped("marco"), skipped("ok"), card("casa"), card("via")], 1);
  assert.deepEqual(chosen.map((c) => c.form), ["casa"]);
  assert.equal(consumed, 3);
});

test("a result with an empty sentence counts as a skip", () => {
  const { chosen } = pickCards(["a", "b"], [{ ...card("a"), italian: " " }, card("b")], 2);
  assert.deepEqual(chosen.map((c) => c.form), ["b"]);
});

test("results are matched to candidates by word, not by position", () => {
  const { chosen } = pickCards(["uno", "due"], [card("due"), card("uno")], 1);
  assert.equal(chosen[0].form, "uno");
});

test("running out of candidates uses them all", () => {
  const { chosen, consumed } = pickCards(["x", "y"], [skipped("x"), skipped("y")], 5);
  assert.equal(chosen.length, 0);
  assert.equal(consumed, 2);
});
