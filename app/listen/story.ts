/** Today's story as the Listening page uses it. Shared by the page, its client hub and the route that makes it. */
export type Story = {
  day: string;
  month: number;
  title: string;
  paragraphs: string[];
  english: string[];
  questions: { question: string; answer: string }[];
  audioUrl: string;
  /** Start time in seconds of every word of the title and paragraphs, in reading order. */
  wordStarts: number[];
};

export type StoryRow = {
  day: string;
  month: number;
  title: string;
  paragraphs: string[];
  english: string[];
  questions: { question: string; answer: string }[];
  audio_url: string;
  word_starts: number[];
};

export const STORY_COLUMNS = "day, month, title, paragraphs, english, questions, audio_url, word_starts";

export function toStory(row: StoryRow): Story {
  return {
    day: row.day,
    month: row.month,
    title: row.title,
    paragraphs: row.paragraphs,
    english: row.english,
    questions: row.questions,
    audioUrl: row.audio_url,
    wordStarts: row.word_starts,
  };
}
