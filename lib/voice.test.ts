import { test } from "node:test";
import assert from "node:assert/strict";
import { wordStarts } from "./voice.ts";

test("each word starts where its first letter starts, however much space is between", () => {
  const text = "Ciao, sono  Giulia.\n\nTu?";
  const characters = [...text];
  const starts = wordStarts({ characters, character_start_times_seconds: characters.map((_, i) => i / 10) });
  assert.deepEqual(starts, [0, 0.6, 1.2, 2.1]);
  assert.equal(starts.length, text.split(/\s+/).filter(Boolean).length);
});
