import type { LanguageProfile } from "./index.ts";
import type { ListeningLevel, PlanPhase } from "../plan.ts";
import type { Show } from "../podcasts.ts";
import frequency from "../data/es-frequency.json" with { type: "json" };

/* The same calendar as Italian, with the grammar in the order courses for Spain teach it. */
const phases: PlanPhase[] = [
  {
    name: "Sound system",
    startWeek: 1,
    endWeek: 4,
    summary: "Five clean vowels, the tapped r and the rolled rr, the Spain z and c, and stress marks, once and for all. Language Transfer, and Anki from day one.",
    grammar: ["the five vowels, r and rr, z and c", "ser, estar and regular verbs"],
    wordTarget: 400,
    pitch:
      "They are a beginner in their first month. Speak slowly and clearly, in short present-tense sentences with very common words. Ask simple questions they can answer in a few words.",
  },
  {
    name: "Core structures",
    startWeek: 5,
    endWeek: 13,
    summary: "A textbook lesson every few days, speaking from now on, and the past tenses as Spain uses them.",
    grammar: [
      "irregular verbs in the present (tener, ir, hacer, poder)",
      "ser or estar",
      "pretérito perfecto for today (he ido)",
      "pretérito indefinido",
      "imperfecto",
      "indefinido or imperfecto",
      "direct and indirect object pronouns",
    ],
    wordTarget: 1000,
    pitch:
      "They know the present tense and are learning the past tenses. Speak at a relaxed pace with everyday words. Ask about today, yesterday, last summer and when they were young, so they need the pretérito perfecto, the indefinido and the imperfecto.",
  },
  {
    name: "Input volume",
    startWeek: 14,
    endWeek: 26,
    summary: "Where most people stall and the gains are. Hoy Hablamos, Unlimited Spanish, series from Spain with Spanish subtitles.",
    grammar: ["futuro and ir a", "condicional", "reflexive verbs", "por or para"],
    wordTarget: 1800,
    pitch:
      "They are between A2 and B1. Speak at a natural but unhurried pace, with some idioms. Bring up plans, wishes and what people do in Barcelona, so they need the future, the conditional and por and para.",
  },
  {
    name: "Native material",
    startWeek: 27,
    endWeek: 52,
    summary: "Native podcasts and TV from Spain, a modern novel, and the subjuntivo.",
    grammar: [
      "subjuntivo after quiero que and espero que",
      "subjuntivo after cuando and para que",
      "imperfect subjuntivo with si",
      "all the tenses in real conversation",
    ],
    wordTarget: 2500,
    pitch:
      "They are working toward a solid B1. Speak naturally, as with any friend from Barcelona. Share wishes, advice and doubts that invite the subjuntivo (ojalá, espero que, no creo que). Only simplify when they struggle.",
  },
];

const listening: ListeningLevel[] = [
  { month: 1, cefr: "A1", storyWords: 80, vocabulary: 300, style: "A slow, simple dialogue in the present tense, with short sentences and plenty of repetition.", shows: ["dreaming-spanish", "coffee-break-spanish"] },
  { month: 2, cefr: "A1", storyWords: 120, vocabulary: 500, style: "A simple dialogue or first-person scene in the present tense that repeats its key words.", shows: ["dreaming-spanish", "notes-in-spanish-beginners", "spanish-obsessed-beginner"] },
  { month: 3, cefr: "A2", storyWords: 160, vocabulary: 800, style: "A short story about today that uses the pretérito perfecto (he ido, hemos visto).", shows: ["notes-in-spanish-beginners", "spanish-obsessed-beginner"] },
  { month: 4, cefr: "A2", storyWords: 200, vocabulary: 1000, style: "A story about the past that mixes the indefinido and the imperfecto.", shows: ["spanish-obsessed-beginner", "hoy-hablamos"] },
  { month: 5, cefr: "A2", storyWords: 250, vocabulary: 1300, style: "A story with some dialogue, the past tenses and object pronouns.", shows: ["hoy-hablamos", "notes-in-spanish-intermediate"] },
  { month: 6, cefr: "B1", storyWords: 300, vocabulary: 1600, style: "A story about plans and wishes that uses the future and the conditional.", shows: ["notes-in-spanish-intermediate", "unlimited-spanish"] },
  { month: 7, cefr: "B1", storyWords: 350, vocabulary: 2000, style: "A conversation between friends with opinions and a few common idioms.", shows: ["unlimited-spanish", "espanol-con-juan", "hoy-hablamos"] },
  { month: 8, cefr: "B1", storyWords: 400, vocabulary: 2300, style: "A lively story at a natural pace, with idioms and reported speech.", shows: ["espanol-con-juan", "unlimited-spanish"] },
  { month: 9, cefr: "B1", storyWords: 450, vocabulary: 2600, style: "Wishes, advice and doubts that bring in the subjuntivo after espero que and no creo que.", shows: ["spanish-obsessed-advanced", "espanol-con-juan"] },
  { month: 10, cefr: "B1+", storyWords: 500, vocabulary: 3000, style: "A short radio-style report or discussion, as a presenter in Spain would say it.", shows: ["spanish-obsessed-advanced", "hoy-en-el-pais"] },
  { month: 11, cefr: "B1+", storyWords: 550, vocabulary: 3500, style: "A native-level conversation with colloquial Spanish from Spain and the full range of tenses.", shows: ["hoy-en-el-pais", "nadie-sabe-nada"] },
  { month: 12, cefr: "B2", storyWords: 600, vocabulary: 4000, style: "Native radio style: natural speed, idioms and longer sentences.", shows: ["nadie-sabe-nada", "un-libro-una-hora"] },
];

/* Learner shows from Spain first, then native radio from month 10. */
const shows: Record<string, Show> = {
  "dreaming-spanish": {
    name: "Dreaming Spanish",
    by: "Pablo and the Dreaming Spanish team",
    feed: "https://rss.buzzsprout.com/2404122.rss",
    about: "Easy chats in beginner Spanish, all comprehensible input.",
  },
  "coffee-break-spanish": {
    name: "Coffee Break Spanish",
    by: "Coffee Break Languages",
    feed: "https://feeds.acast.com/public/shows/985e7c00-8945-4e0d-a4da-b93049180ce1",
    about: "Short lessons, explained in English.",
  },
  "notes-in-spanish-beginners": {
    name: "Notes in Spanish Inspired Beginners",
    by: "Ben Curtis and Marina Diez",
    feed: "https://rss.libsyn.com/shows/19057/destinations/14862.xml",
    about: "Everyday situations in Spain, slowly. Start at episode one.",
    inChapterOrder: true,
  },
  "spanish-obsessed-beginner": {
    name: "Beginner Spanish with Spanish Obsessed",
    by: "Rob and Lucy",
    feed: "https://feeds.transistor.fm/beginner-spanish-with-spanish-obsessed",
    about: "Short conversations for beginners. Start at episode one.",
    inChapterOrder: true,
  },
  "hoy-hablamos": {
    name: "Hoy Hablamos",
    by: "Hoy Hablamos",
    feed: "https://www.hoyhablamos.com/category/podcast/feed/",
    about: "A short daily episode in clear Spanish from Spain.",
  },
  "notes-in-spanish-intermediate": {
    name: "Notes in Spanish Intermediate",
    by: "Ben Curtis and Marina Diez",
    feed: "https://rss.libsyn.com/shows/18817/destinations/13969.xml",
    about: "Real conversations about life in Spain.",
  },
  "unlimited-spanish": {
    name: "Unlimited Spanish",
    by: "Òscar Pellus",
    feed: "https://rss.libsyn.com/shows/73741/destinations/320894.xml",
    about: "Stories and culture from a teacher in Barcelona.",
  },
  "espanol-con-juan": {
    name: "Español con Juan",
    by: "Juan Fernández",
    feed: "https://espanolconjuan.blubrry.net/feed/podcast/",
    about: "Funny, opinionated episodes at a natural pace.",
  },
  "spanish-obsessed-advanced": {
    name: "Advanced Spanish with Spanish Obsessed",
    by: "Rob and Lucy",
    feed: "https://feeds.transistor.fm/advanced-spanish-with-spanish-obsessed",
    about: "Long conversations at native speed.",
  },
  "hoy-en-el-pais": {
    name: "Hoy en EL PAÍS",
    by: "EL PAÍS",
    feed: "https://www.omnycontent.com/d/playlist/26708dff-8243-49e4-a5b6-adb700ec9cae/a7906eb0-d14b-4bc1-a048-ae30009a0e51/3ec1b1fa-5520-4b11-b8f2-ae30009a0e77/podcast.rss",
    about: "A daily news story from Spain's biggest paper, for native listeners.",
  },
  "nadie-sabe-nada": {
    name: "Nadie Sabe Nada",
    by: "Andreu Buenafuente and Berto Romero, Cadena SER",
    feed: "https://fapi-top.prisasd.com/podcast/playser/nadie_sabe_nada/itunestfp/podcast.xml",
    about: "Improvised comedy from two comedians from Catalonia, for native listeners.",
  },
  "un-libro-una-hora": {
    name: "Un Libro Una Hora",
    by: "Cadena SER",
    feed: "https://fapi-top.prisasd.com/api/v2/feed-rss/playser/un-libro-una-hora/itunestfp",
    about: "One novel told in one hour, for native listeners.",
  },
};

export const es: LanguageProfile = {
  code: "es",
  label: "Spanish",
  nativeName: "Español",
  speechLang: "es-ES",
  variety: "standard Peninsular Spanish",
  country: "Spain",
  elevenLabsLanguage: "es",
  // Sofia: young, warm, urban accent from Madrid and Barcelona. From the ElevenLabs library.
  voiceId: "2BJPFS2QZRUEpfkbclGy",
  partner: {
    name: "Laia",
    role: "Works in a record shop in the Raval",
    city: "Barcelona",
    timeZone: "Europe/Madrid",
    routine: [
      [9, "asleep, probably"],
      [11, "having a cortado before the shop opens"],
      [14, "at the record shop"],
      [17, "on a long lunch"],
      [21, "back at the shop"],
      [24, "out for a late dinner in Gràcia"],
    ],
  },
  dialect: "light",
  persona: `
Eres Laia, 30 años, nacida en Barcelona. Vives en un piso pequeño en Gràcia y trabajas en una
tienda de discos de segunda mano en el Raval. Vives con Pau, un gato gordo y antipático que duerme
encima de los vinilos. Te gustan el vermut de los domingos, bajar a la playa del Bogatell temprano
y el Barça, aunque dices que no te importa. Te quejas con gusto de los turistas, de los patinetes
y de lo que cuesta el alquiler. Tienes tu vida, tus opiniones y tus días malos.

Hablas castellano de Barcelona, como se habla de verdad: frases cortas, muletillas (bueno, pues,
o sea, en plan), a veces te interrumpes y cambias de tema. Nunca hablas como un libro.
`.trim(),
  dialectRules: {
    light: `
Eres de Barcelona y se nota: "vale", "venga", "tío" o "tía", "qué fuerte", "mola", y de vez en
cuando una palabra en catalán como "home", "nen" o "adéu". Pero sigues siendo fácil de entender:
castellano estándar de España con color barcelonés.
`.trim(),
    full: `
Hablas como una barcelonesa joven de verdad: "en plan", "me flipa", "qué palo", "está chungo",
"currar", "pasta", "tope de guay", y mezclas catalán sin pensarlo ("home", "nen", "va", "doncs").
No te contienes.
`.trim(),
  },
  firstMessage: "¡Hola! ¿Qué tal? ¿Cómo te ha ido el día?",
  starterMission: {
    title: "Introduce yourself to Laia",
    why: "Your name, where you live, and why you are learning Spanish.",
  },
  commonMistakes: [
    "ser or estar",
    "pretérito perfecto or indefinido (Spain uses he ido for today, fui for a finished time)",
    "indefinido or imperfecto",
    "gender and number agreement of adjectives and articles",
    "por or para",
    "vosotros forms (vosotros tenéis, os)",
    "subjuntivo after espero que, quiero que, no creo que",
    "false friends from English (embarazada, actualmente, realizar, librería, carpeta)",
    "gustar and similar verbs (me gusta, me encantan)",
  ],
  starterVocab: ["vale", "venga", "guay", "mola", "qué fuerte", "en plan", "pues nada", "tío / tía"],
  frequency,
  phases,
  listening,
  shows,
};
