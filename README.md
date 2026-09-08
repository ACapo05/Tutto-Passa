# Tutto Passa

Ten minutes of spoken Italian a day, with someone who never corrects you to your face.

You buzz Giulia's citofono. She is a bookseller in Testaccio and she talks to you like a
friend who knows you are still learning: when you get something wrong she uses the right form
back at you in her next sentence and carries on. Nothing is explained during the call.

Afterwards Claude reads the transcript and writes the report — what you said, what it should
have been, and two or three things to work on. Those become review items with a due date, and
what is due steers the next conversation. A push notification asks you for your ten minutes.

## Setup

1. **Supabase** — run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.

2. **ElevenLabs** — create a Conversational AI agent. Then, on its **Security** tab, enable
   overrides for **System prompt**, **First message** and **Language**. This is not optional:
   the persona is built in [`lib/languages.ts`](lib/languages.ts) and sent per session, so
   without those toggles every call fails to start.

3. **Keys** — `cp .env.local.example .env.local` and fill it in.
   Generate the push pair once with `npx web-push generate-vapid-keys`.

4. **Voice** — `npm run find-voice` lists every Italian voice in the library grouped by
   accent, with preview links. Pick one and set `voiceId` in `lib/languages.ts`.
   `npm run find-voice romano` filters by a search term.

5. `npm run dev`

## Daily reminder

The reminder needs the app deployed, because a sleeping laptop cannot send a push. Deploy to
Vercel, set the same environment variables there, then on your phone: open the site in Safari,
**Add to Home Screen**, open it from the icon, and tap **Ricordamelo ogni giorno**. iOS only
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

Correct use doubles the interval, up to 180 days. The same mistake again resets it to
tomorrow and increments the count, so a persistent error looks different from a slip. The
review event is using the thing correctly in real speech, not answering a card — which is why
there is no quiz anywhere in the app. See [`lib/srs.ts`](lib/srs.ts); `npm test` covers it.

## Notes

- The transcript is not ready when the call ends. `/api/session/end` polls ElevenLabs until
  the conversation reports `done`, then runs the critique.
- Speech recognition mangles dialect. `dialect` in the Italian profile is a dial
  (`off | light | full`) and starts at `light`. Read a raw transcript before turning it up —
  a garbled transcript makes the report invent mistakes you never made.
- One user, no auth, no row-level security. Only server routes touch the database.
