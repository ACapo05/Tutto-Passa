# Contributing

Thank you for helping. Tutto Passa is small on purpose: one learner, their own accounts, no
server to share. Please keep changes in that spirit.

## Set up

Follow [Run your own](README.md#run-your-own) in the README. Before you open a pull request, run:

```bash
npm test        # the scheduler, the plan, the deck and every language profile
npm run lint
npm run build
```

## Add a language

A language is one file. Nothing outside `lib/languages/` and `lib/data/` should need to change.

1. **Word list.** Take the first 4,000 entries of `content/2018/<code>/<code>_50k.txt` from
   [FrequencyWords](https://github.com/hermitdave/FrequencyWords), keep only the words, remove
   any with a digit, and save them as a JSON array in `lib/data/<code>-frequency.json`. Add a
   line for it to [`lib/data/README.md`](lib/data/README.md) (the list is CC BY-SA 4.0).
2. **Profile.** Copy [`lib/languages/it.ts`](lib/languages/it.ts) to `lib/languages/<code>.ts`.
   Translate or rewrite each part:
   - `persona`, `dialectRules` and `firstMessage` are written **in the language**: the voice
     agent thinks in it.
   - `partner`, `starterMission`, `commonMistakes` and the plan text are written **in English**:
     the learner reads them.
   - `phases` must cover weeks 1 to 52 with no gaps. Put the grammar in the order a course for
     that language would teach it.
   - `listening` has twelve levels, each longer than the one before.
   - `shows` are podcasts with a public RSS feed and an audio enclosure on each episode.
     Learner shows first, native ones from month 10. The feed is read live; nothing is copied.
3. **Register it.** Import it in [`lib/languages/index.ts`](lib/languages/index.ts) and add it
   to `LANGUAGES`. The picker on Home shows it at once.
4. **Check it.** `npm test` checks every profile: the plan's weeks, the listening ladder, that
   each show exists, the time zone and the word list. Then make one real call in the language
   and read the report.

A native speaker should read the persona and the dialect rules before they are merged. Keep
`dialect` at `light`: speech recognition mangles dialect, and a garbled transcript makes the
report invent mistakes.

## Design

The tokens live in [`app/globals.css`](app/globals.css), and `/stile` renders every component
with them. Keep to the rules in [`PRODUCT.md`](PRODUCT.md): no points, streak flames or
confetti; no chat bubbles or the word "AI"; help is English text, and everything you hear is in
the language. Text in the language uses `font-voice` and a `lang` attribute.

## Licence

By contributing you agree that your work is licensed under the
[GNU Affero General Public License v3.0](LICENSE), like the rest of the code.
