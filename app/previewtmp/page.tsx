"use client";
import { Report } from "../page";
const sample = {
  summary: "Buona chiacchierata — hai retto dieci minuti senza passare all'inglese, e questo è il punto. Il passato prossimo ti tradisce ancora con i verbi di movimento.",
  memory: "Sei andato a Napoli il mese scorso e hai odiato i treni. Lavori troppo.",
  corrections: [
    { item_key: "essere-auxiliary-motion-verbs", kind: "grammar" as const, you_said: "Io ho andato a Napoli", correct_form: "Sono andato a Napoli", explanation: "Andare takes essere, not avere. Verbs of movement almost always do." },
    { item_key: "adjective-agreement-plural", kind: "grammar" as const, you_said: "I treni era lento", correct_form: "I treni erano lenti", explanation: "Plural subject, so both the verb and the adjective go plural." },
  ],
  handled_correctly: ["magari"],
  new_vocab: [
    { item_key: "sciopero", word: "sciopero", meaning: "a strike — you will need this one for the trains" },
    { item_key: "meno-male", word: "meno male", meaning: "thank goodness" },
  ],
  focus_next: ["Essere vs avere in the past tense, especially with andare and venire.", "Making adjectives agree when the subject is plural."],
};
export default function Preview() {
  return <main className="mx-auto w-full max-w-2xl px-5 py-10"><Report report={sample} /></main>;
}
