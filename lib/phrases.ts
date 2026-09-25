const plain = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Whether what you said in the call contains a phrase, or one of its "a / b" alternatives.
 * Loose on case, accents and punctuation, because speech recognition is; strict on whole words.
 */
export function saidPhrase(heard: string, phrase: string) {
  const said = ` ${plain(heard)} `;
  return phrase.split("/").map(plain).some((alt) => alt.length > 0 && said.includes(` ${alt} `));
}
