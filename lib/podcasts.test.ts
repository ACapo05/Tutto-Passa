import { test } from "node:test";
import assert from "node:assert/strict";
import { decode, parseFeed, pickEpisodes, toSeconds, type Show } from "./podcasts.ts";

const FEED = `<?xml version="1.0"?><rss><channel><title>Show</title>
<item><title><![CDATA[Capitolo 2 – Una giornata strana]]></title><itunes:title>ignored</itunes:title>
<pubDate>Fri, 27 Feb 2026 10:00:00 GMT</pubDate><itunes:duration>00:04:46</itunes:duration>
<enclosure url="https://x.test/2.mp3?a=1&amp;b=2" type="audio/mpeg" length="1"/></item>
<item><title>Episode 739: Le Mura di Lucca (Storia di una citt&#224;) - Intermedio #3</title><pubDate>not a date</pubDate>
<itunes:duration>692</itunes:duration><enclosure type="audio/mpeg" url="https://x.test/739.mp3"/></item>
<item><title>No audio here</title></item>
</channel></rss>`;

test("reads episodes with audio and skips the rest", () => {
  const episodes = parseFeed(FEED);
  assert.equal(episodes.length, 2);
  assert.deepEqual(episodes[0], {
    title: "Capitolo 2 – Una giornata strana",
    audio: "https://x.test/2.mp3?a=1&b=2",
    published: "2026-02-27T10:00:00.000Z",
    seconds: 286,
  });
  assert.equal(episodes[1].title, "Episode 739: Le Mura di Lucca (Storia di una città) - Intermedio #3");
  assert.equal(episodes[1].published, null);
  assert.equal(episodes[1].seconds, 692);
});

test("durations come in three shapes", () => {
  assert.equal(toSeconds("1805"), 1805);
  assert.equal(toSeconds("26:44"), 1604);
  assert.equal(toSeconds("00:05:22"), 322);
  assert.equal(toSeconds(""), null);
  assert.equal(toSeconds("soon"), null);
});

test("entities decode, unknown ones stay as they are", () => {
  assert.equal(decode("perch&#xE9; &quot;s&igrave;&quot;"), 'perché "s&igrave;"');
});

test("a show's filter and order decide what is offered", () => {
  const episodes = parseFeed(FEED);
  const levelled: Show = { name: "", by: "", feed: "", about: "", titleFilter: /intermedio/i };
  assert.deepEqual(pickEpisodes(levelled, episodes).map((e) => e.seconds), [692]);
  const serial: Show = { name: "", by: "", feed: "", about: "", inChapterOrder: true };
  assert.deepEqual(pickEpisodes(serial, episodes, 1).map((e) => e.seconds), [286]); // chapter 2 before episode 739
});

test("a serial starts at its intro and chapter one, whatever order the feed uploaded them in", () => {
  const ep = (title: string) => ({ title, audio: title, published: null, seconds: null });
  const feed = [
    ep("Capitolo 12 – Ritorno | Italian Listening A1–A2"),
    ep("Ciao e benvenuti! Start from here."),
    ep("Capitolo 2 – Una giornata strana | Italian Listening A1–A2"),
    ep("Capitolo 1 – Il Professore | Italian Listening A1–A2"),
  ];
  const serial: Show = { name: "", by: "", feed: "", about: "", inChapterOrder: true };
  assert.deepEqual(pickEpisodes(serial, feed).map((e) => e.title.slice(0, 11)), ["Ciao e benv", "Capitolo 1 ", "Capitolo 2 "]);
});
