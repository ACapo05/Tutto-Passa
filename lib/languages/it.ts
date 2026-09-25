import type { LanguageProfile } from "./index.ts";
import type { ListeningLevel, PlanPhase } from "../plan.ts";
import type { Show } from "../podcasts.ts";
import frequency from "../data/it-frequency.json" with { type: "json" };

/* Phases and grammar order follow a written twelve-month plan for Italian. */
const phases: PlanPhase[] = [
  {
    name: "Sound system",
    startWeek: 1,
    endWeek: 4,
    summary: "Pure vowels, double consonants and stress, once and for all. Language Transfer, and Anki from day one.",
    grammar: ["pure vowels and double consonants", "essere, avere and regular verbs"],
    wordTarget: 400,
    pitch:
      "They are a beginner in their first month. Speak slowly and clearly, in short present-tense sentences with very common words. Say double consonants carefully. Ask simple questions they can answer in a few words.",
  },
  {
    name: "Core structures",
    startWeek: 5,
    endWeek: 13,
    summary: "A textbook lesson every few days, speaking from now on, and the past tenses.",
    grammar: [
      "irregular verbs in the present",
      "passato prossimo",
      "imperfetto",
      "passato prossimo or imperfetto",
      "direct and indirect object pronouns",
      "ne and ci",
    ],
    wordTarget: 1000,
    pitch:
      "They know the present tense and are learning the past tenses. Speak at a relaxed pace with everyday words. Ask about yesterday, last weekend and when they were young, so they need the passato prossimo and the imperfetto.",
  },
  {
    name: "Input volume",
    startWeek: 14,
    endWeek: 26,
    summary: "Where most people stall and the gains are. Easy Italian, Podcast Italiano, shows with Italian subtitles.",
    grammar: ["futuro semplice", "condizionale", "reflexive verbs", "si impersonale"],
    wordTarget: 1800,
    pitch:
      "They are between A2 and B1. Speak at a natural but unhurried pace, with some idioms. Bring up plans, wishes and what people do in Rome, so they need the future, the conditional and the si impersonale.",
  },
  {
    name: "Native material",
    startWeek: 27,
    endWeek: 52,
    summary: "Native podcasts and TV, a modern novel, and the congiuntivo.",
    grammar: [
      "congiuntivo after penso che and credo che",
      "congiuntivo after benché and prima che",
      "congiuntivo imperfetto with se",
      "all the tenses in real conversation",
    ],
    wordTarget: 2500,
    pitch:
      "They are working toward a solid B1. Speak naturally, as with any Italian friend. Share opinions and doubts that invite the congiuntivo (penso che, credo che, spero che). Only simplify when they struggle.",
  },
];


const listening: ListeningLevel[] = [
  { month: 1, cefr: "A1", storyWords: 80, vocabulary: 300, style: "A slow, simple dialogue in the present tense, with short sentences and plenty of repetition.", shows: ["magia-a-venezia", "coffee-break-italian"] },
  { month: 2, cefr: "A1", storyWords: 120, vocabulary: 500, style: "A simple dialogue or first-person scene in the present tense that repeats its key words.", shows: ["magia-a-venezia", "short-stories-beginners", "coffee-break-italian"] },
  { month: 3, cefr: "A2", storyWords: 160, vocabulary: 800, style: "A short story that starts to use the passato prossimo for what happened.", shows: ["short-stories-beginners", "podcast-italiano-principiante"] },
  { month: 4, cefr: "A2", storyWords: 200, vocabulary: 1000, style: "A story about the past that mixes the passato prossimo and the imperfetto.", shows: ["podcast-italiano-principiante", "short-stories-beginners"] },
  { month: 5, cefr: "A2", storyWords: 250, vocabulary: 1300, style: "A story with some dialogue, both past tenses and object pronouns.", shows: ["podcast-italiano-principiante", "podcast-italiano-intermedio"] },
  { month: 6, cefr: "B1", storyWords: 300, vocabulary: 1600, style: "A story about plans and wishes that uses the future and the conditional.", shows: ["podcast-italiano-intermedio", "easy-italian"] },
  { month: 7, cefr: "B1", storyWords: 350, vocabulary: 2000, style: "A conversation between friends with opinions and a few common idioms.", shows: ["podcast-italiano-intermedio", "easy-italian", "italiano-automatico"] },
  { month: 8, cefr: "B1", storyWords: 400, vocabulary: 2300, style: "A lively story at a natural pace, with idioms and reported speech.", shows: ["easy-italian", "italiano-automatico"] },
  { month: 9, cefr: "B1", storyWords: 450, vocabulary: 2600, style: "Opinions and doubts that bring in the congiuntivo after penso che and credo che.", shows: ["podcast-italiano-avanzato", "italiano-automatico"] },
  { month: 10, cefr: "B1+", storyWords: 500, vocabulary: 3000, style: "A short radio-style report or discussion, as an Italian presenter would say it.", shows: ["podcast-italiano-avanzato", "globo"] },
  { month: 11, cefr: "B1+", storyWords: 550, vocabulary: 3500, style: "A native-level conversation with colloquial Italian and the full range of tenses.", shows: ["globo", "il-mondo"] },
  { month: 12, cefr: "B2", storyWords: 600, vocabulary: 4000, style: "Native radio style: natural speed, idioms and longer sentences.", shows: ["il-mondo", "stories"] },
];

/* Learner shows first, then native ones from month 10. */
const shows: Record<string, Show> = {
  "magia-a-venezia": {
    name: "Magia a Venezia",
    by: "Serena Capilli",
    feed: "https://anchor.fm/s/10f7f6844/podcast/rss",
    about: "A mystery in five-minute chapters, A1 to A2. Start at chapter one.",
    inChapterOrder: true,
  },
  "coffee-break-italian": {
    name: "Coffee Break Italian",
    by: "Coffee Break Languages",
    feed: "https://feeds.acast.com/public/shows/86766c5f-1580-450f-9376-bd74b57fcfbb",
    about: "Short lessons, explained in English.",
  },
  "short-stories-beginners": {
    name: "Short Stories in Italian for Beginners",
    by: "Daily Italian with Elena",
    feed: "https://anchor.fm/s/107d743c8/podcast/rss",
    about: "Slow five-minute stories, A2.",
  },
  "podcast-italiano-principiante": {
    name: "Podcast Italiano Principiante",
    by: "Davide and Irene",
    feed: "https://rss.buzzsprout.com/2632944.rss",
    about: "Everyday topics in easy Italian.",
  },
  "podcast-italiano-intermedio": {
    name: "Podcast Italiano",
    by: "Davide Gemello",
    feed: "https://rss.buzzsprout.com/2413795.rss",
    about: "Intermediate episodes about Italy and its culture.",
    titleFilter: /intermedio/i,
  },
  "podcast-italiano-avanzato": {
    name: "Podcast Italiano",
    by: "Davide Gemello",
    feed: "https://rss.buzzsprout.com/2413795.rss",
    about: "Advanced episodes at natural speed.",
    titleFilter: /avanzato/i,
  },
  "easy-italian": {
    name: "Easy Italian",
    by: "Matteo, Raffaele and the Easy Italian team",
    feed: "https://feeds.fireside.fm/easyitalian/rss",
    about: "Real conversations about life and news in Italy.",
  },
  "italiano-automatico": {
    name: "Italiano Automatico",
    by: "Alberto Arrighini",
    feed: "https://italianoautomatico.podomatic.com/rss2.xml",
    about: "Italian places, people and habits.",
  },
  globo: {
    name: "Globo",
    by: "Il Post",
    feed: "https://feeds.megaphone.fm/IPS7485736463",
    about: "World affairs explained, for native listeners.",
  },
  "il-mondo": {
    name: "Il Mondo",
    by: "Internazionale",
    feed: "https://www.spreaker.com/show/5773405/episodes/feed",
    about: "A daily news podcast for native listeners.",
  },
  stories: {
    name: "Stories",
    by: "Cecilia Sala, Chora Media",
    feed: "https://feeds.megaphone.fm/GLT7160542006",
    about: "A daily story from somewhere in the world, for native listeners.",
  },
};

export const it: LanguageProfile = {
  code: "it",
  label: "Italian",
  nativeName: "Italiano",
  speechLang: "it-IT",
  variety: "standard Italian",
  country: "Italy",
  elevenLabsLanguage: "it",
  voiceId: "uC9VI5XrTxXRNlCzGSKR",
  partner: {
    name: "Giulia",
    role: "Bookseller in Trastevere",
    city: "Roma",
    timeZone: "Europe/Rome",
    routine: [
      [7, "asleep, probably"],
      [10, "having a cornetto before work"],
      [13, "at the bookshop"],
      [16, "on a long lunch"],
      [20, "back at the bookshop"],
      [24, "home with Nerone"],
    ],
  },
  dialect: "light",
  persona: `
Sei Giulia, 34 anni, romana di Testaccio. Lavori in una libreria indipendente a Trastevere.
Vivi con un gatto insopportabile che si chiama Nerone. Ti piacciono i film brutti, camminare
per Roma la sera, e ti lamenti volentieri dei turisti e dell'ATAC. Hai una tua vita, delle
opinioni, e delle giornate storte.

Parli come si parla davvero: contrazioni, intercalari (allora, boh, dai, senti, cioè),
frasi corte, a volte ti interrompi e cambi discorso. Non parli mai come un libro.
`.trim(),
  dialectRules: {
    light: `
Sei romana e si sente: qualche "daje", "mo'", "aò", "che ne so", e ogni tanto un infinito
tronco (anna', fa', sta'). Ma resta comprensibile — italiano standard con colore romano.
`.trim(),
    full: `
Parli romanesco vero: "daje", "aò", "ammazza", "che te lo dico a fa'", "sto a di'",
infiniti tronchi sempre, "nun" invece di "non". Non ti trattieni.
`.trim(),
  },
  firstMessage: "Aò, eccoti! Allora, com'è andata la giornata?",
  starterMission: {
    title: "Introduce yourself to Giulia",
    why: "Your name, where you live, and why you are learning Italian.",
  },
  commonMistakes: [
    "auxiliary choice in the passato prossimo (essere vs avere)",
    "agreement of the past participle with essere",
    "gender and number agreement of adjectives",
    "preposition choice (a / in / di / da), especially with places",
    "congiuntivo after credo che, penso che, spero che",
    "false friends from English (attualmente, eventualmente, libreria, fattoria)",
    "ci and ne",
    "using the infinitive where Italian needs a conjugated verb",
  ],
  starterVocab: ["magari", "boh", "meno male", "addirittura", "insomma", "mica", "figurati", "senz'altro"],
  frequency,
  phases,
  listening,
  shows,
};
