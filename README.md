# Tutto Passa

Ten minutes of spoken Italian a day, with someone who never corrects you to your face.

You give Giulia a call. She is a bookseller in Testaccio and she talks to you like a
friend who knows you are still learning; when you get something wrong she uses the right form
back at you in her next sentence and carries on. Nothing is explained during the call. 

Afterwards Claude reads the transcript and writes the report, what you said, what it should
have been, and two or three things to work on. Those become review items with a due date, and
what is due steers the next conversation. A push notification asks you for your ten minutes.

## Run your own

There is no shared server and no sign-up. Everyone runs their own copy with their own accounts
and pays those services directly for what they use. You need Node 20 or later, and accounts with:

- **Supabase**: the database. The free tier is enough.
- **ElevenLabs**: Giulia's voice on calls, and the daily listening story.
- **Anthropic**: call reports, flashcard sentences, stories and in-call help.

1. **Code.** `git clone https://github.com/ACapo05/Tutto-Passa.git`, then `npm install`.
2. **Database.** Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql)
   in its SQL Editor.
3. **Voice agent.** In ElevenLabs, create an agent and an API key with **ElevenAgents: Read** and
   **Text to Speech**. For Giulia's full persona and voice, turn on the **System prompt**, **First
   message**, **Language** and **Voice** overrides on the agent's Security tab. Calls still work
   without them, with the agent's own first line and voice.
4. **Keys.** `cp .env.local.example .env.local` and fill it in. Generate the push pair once with
   `npx web-push generate-vapid-keys`.
5. **Run.** `npm run dev`, open http://localhost:3000, allow the microphone, and call Giulia.

Optional: `npm run find-voice` lists Italian voices by accent (set `voiceId` in
[`lib/languages.ts`](lib/languages.ts)), and `PLAN_START` in [`lib/plan.ts`](lib/plan.ts) sets
when your year begins.

There is no login yet, so anyone who can open a deployed copy can use it on your accounts. Keep
the address private.

## Daily reminder

The reminder needs the app deployed, because a sleeping laptop cannot send a push. Deploy to
Vercel, set the same environment variables there, then on your phone: open the site in Safari,
**Add to Home Screen**, open it from the icon, and tap **Turn on** next to Daily reminder. iOS only
allows web push from a Home Screen app on iOS 16.4 or later, and only from a real tap.

The cron runs once a day. On Vercel's Hobby plan the trigger drifts by up to 59 minutes, so
`0 8 * * *` arrives somewhere between 08:00 and 08:59. That is the plan's limit, not a bug.

To test it without waiting:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/remind
```

## Another language

Add an entry to `LANGUAGES` in [`lib/languages.ts`](lib/languages.ts) and open `/?lang=fr`.
The conversation, critique and review code never names a language — nothing else changes.

## The review schedule

Every correction and saved word is a flashcard scheduled with FSRS, the scheduler Anki offers,
through [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (MIT). Anki's own code is
AGPL, so none of it is copied here.

A card is reviewed in two places. On `/review` you say the answer out loud, check it, and rate
it Again, Hard, Good or Easy (keys 1 to 4). In a call, using an item correctly counts as Good
and making the same mistake again counts as Again, which also bumps `recurrence_count` so a
persistent error looks different from a slip. Giulia steers toward what is due and uses words
you learned in the last week. See [`lib/srs.ts`](lib/srs.ts); `npm test` covers it.

## The built-in deck

Five new words a day, each learned in both directions (ten new cards; the English to Italian card
comes the day after, as Anki buries new siblings), from principles with a
solid track record: most frequent words first (Paul Nation's vocabulary research), one new
thing per sentence (Stephen Krashen's comprehensible input), Italian to English and back (Luca
Lampariello), and sound first, with the browser's Italian voice on every card (Gabriel Wyner).

Word order comes from [`lib/data/it-frequency.json`](lib/data/it-frequency.json), the 4,000 most
frequent forms in Italian film and TV subtitles, from
[FrequencyWords](https://github.com/hermitdave/FrequencyWords) (CC BY-SA 4.0; see
[`lib/data/README.md`](lib/data/README.md)). Claude writes each sentence at the level your plan
sets for the current phase, around this week's grammar. `deck_state` remembers how far through
the list you are. Change the pace in [`lib/deck.ts`](lib/deck.ts).

## Listening

`/listen` steps up a level every 30 days (see `LISTENING_LEVELS` in [`lib/plan.ts`](lib/plan.ts)):
longer stories, more words and richer grammar, then native podcasts from month 10.

- **Today's story.** Claude writes a short text at the month's level that reuses your recent
  deck words (comprehensible input), and ElevenLabs reads it once in Giulia's voice. The audio is
  stored in a public Supabase bucket, `listening`, created on first use. Listen first, then
  read along: words light up as the voice reaches them, and any word can be tapped for English.
- **Real podcasts.** Episodes picked for the month from learner shows (Magia a Venezia, Coffee
  Break Italian, Podcast Italiano, Easy Italian, Italiano Automatico), then native ones (Globo,
  Il Mondo, Stories). They stream from each show's public feed; nothing is copied. Shows and
  feeds are in [`lib/podcasts.ts`](lib/podcasts.ts).
- **Minutes count themselves.** Every minute that actually plays on the page is added to today's
  listening. Time spent elsewhere can be added by hand.

Upgrading an existing database: run the `alter table items` lines, `stories`, `deck_state` and
`habits` from [`supabase/schema.sql`](supabase/schema.sql).

## Notes

- The transcript is not ready when the call ends. `/api/session/end` polls ElevenLabs until
  the conversation reports `done`, then runs the critique.
- Speech recognition mangles dialect. `dialect` in the Italian profile is a dial
  (`off | light | full`) and starts at `light`. Read a raw transcript before turning it up —
  a garbled transcript makes the report invent mistakes you never made.
- One user, no auth, no row-level security. Only server routes touch the database.

## Licence

The code is licensed under the [GNU Affero General Public License v3.0](LICENSE). You may use,
change and self-host it; if you run a changed version for other people over a network, you must
share its source with them. The word list in `lib/data` is CC BY-SA 4.0 (see
[`lib/data/README.md`](lib/data/README.md)). Podcasts belong to their creators and stream from
their own public feeds.
