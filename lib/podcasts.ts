/**
 * Real Italian podcasts, streamed from each show's own public feed, the way a podcast app does.
 * Nothing is downloaded or re-hosted. No imports, so node --test can load it directly.
 */

export type Show = {
  name: string;
  by: string;
  feed: string;
  about: string;
  /** Keep only episodes whose title matches, e.g. Podcast Italiano's level tags. */
  titleFilter?: RegExp;
  /** A serial heard from the start: sorted by the chapter number in each title, an intro without one first. */
  inChapterOrder?: boolean;
};

export type Episode = { title: string; audio: string; published: string | null; seconds: number | null };

export const SHOWS: Record<string, Show> = {
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

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Strips CDATA and decodes the entities feeds actually use (&amp;, &#249;, &#x2019;). */
export function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] !== "#") return ENTITIES[entity.toLowerCase()] ?? match;
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    })
    .trim();
}

function tag(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return match ? decode(match[1]) : "";
}

/** "1805", "26:44" or "00:05:22" as seconds. */
export function toSeconds(duration: string): number | null {
  if (!duration) return null;
  const parts = duration.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

/** Episodes with audio, in feed order. A plain RSS read: feeds are regular enough not to need a parser library. */
export function parseFeed(xml: string): Episode[] {
  return xml
    .split(/<item[\s>]/)
    .slice(1)
    .flatMap((item) => {
      const audio = item.match(/<enclosure[^>]*\burl="([^"]+)"/)?.[1];
      if (!audio) return [];
      const date = Date.parse(tag(item, "pubDate"));
      return [
        {
          title: tag(item, "title"),
          audio: decode(audio),
          published: Number.isNaN(date) ? null : new Date(date).toISOString(),
          seconds: toSeconds(tag(item, "itunes:duration")),
        },
      ];
    });
}

/** The episodes to offer from one show: its level filter, its order, then the first few. */
export function pickEpisodes(show: Show, episodes: Episode[], count = 3): Episode[] {
  const matching = show.titleFilter ? episodes.filter((e) => show.titleFilter!.test(e.title)) : episodes;
  // Upload dates cannot be trusted for a serial (chapters are often uploaded in any order on one day),
  // but titles can: the first number in "Capitolo 12 – ... A1–A2" is the chapter.
  const chapter = (e: Episode) => Number(e.title.match(/\d+/)?.[0] ?? 0);
  return (show.inChapterOrder ? [...matching].sort((a, b) => chapter(a) - chapter(b)) : matching).slice(0, count);
}
