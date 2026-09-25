import { test } from "node:test";
import assert from "node:assert/strict";
import { saidPhrase } from "./phrases.ts";

test("ignores case, punctuation, accents and apostrophe style", () => {
  assert.equal(saidPhrase("Allora... Il mio cane si chiama Piper!", "il mio cane si chiama Piper"), true);
  assert.equal(saidPhrase("sì, ho trent'anni", "ho trent’anni"), true);
  assert.equal(saidPhrase("perche e molto grande", "perché è molto grande"), true);
});

test("any alternative after a slash counts", () => {
  assert.equal(saidPhrase("la casa è grande perché è molto grande", "quello molto grande / perché è molto grande"), true);
});

test("needs whole words", () => {
  assert.equal(saidPhrase("giallo", "già"), false);
  assert.equal(saidPhrase("la mocha", "la moka"), false);
  assert.equal(saidPhrase("", "già"), false);
  assert.equal(saidPhrase("ciao", " / "), false);
});
