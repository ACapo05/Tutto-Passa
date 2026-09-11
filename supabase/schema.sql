-- Run this once in the Supabase SQL editor.
-- One personal user: no auth, no row-level security. Only server routes touch these tables,
-- using the service-role key.

create table if not exists sessions (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text unique not null,
  language        text not null,
  started_at      timestamptz,
  duration_secs   int,
  transcript      jsonb not null,
  report          jsonb,
  memory          text,                      -- one line, carried into the next conversation
  created_at      timestamptz default now()
);

create table if not exists items (
  id               uuid primary key default gen_random_uuid(),
  language         text not null,
  kind             text not null check (kind in ('mistake','vocab','deck')),
  item_key         text not null,            -- stable slug; this is what decides new vs repeat
  you_said         text,
  correct_form     text,
  note             text,
  first_seen       date default current_date,
  last_reviewed    date,
  next_due         date default current_date,
  interval_days    int  default 1,
  recurrence_count int  default 1,
  fsrs             jsonb,                     -- FSRS card state (ts-fsrs); null is treated as a new card
  card             jsonb,                     -- deck cards only: { word, gloss, direction }
  unique (language, kind, item_key)
);

create index if not exists items_due_idx on items (language, next_due);

-- Databases created before flashcards: add the new columns and allow deck cards.
alter table items add column if not exists fsrs jsonb;
alter table items add column if not exists card jsonb;
alter table items drop constraint if exists items_kind_check;
alter table items add constraint items_kind_check check (kind in ('mistake','vocab','deck'));

-- One listening story a day: written at the month's level, recorded once. Audio lives in the
-- public "listening" storage bucket, which the app creates on first use.
create table if not exists stories (
  language    text  not null,
  day         date  not null,
  month       int   not null,
  title       text  not null,
  paragraphs  jsonb not null,
  english     jsonb not null,
  questions   jsonb not null,
  audio_url   text  not null,
  word_starts jsonb not null,
  created_at  timestamptz default now(),
  primary key (language, day)
);

-- How far through lib/data/it-frequency.json the built-in deck has got.
create table if not exists deck_state (
  language text primary key,
  position int  not null default 0
);

create table if not exists push_subscriptions (
  endpoint     text primary key,
  subscription jsonb not null,
  created_at   timestamptz default now()
);

-- The study plan's daily non-negotiable that happens outside the app. Speaking and flashcards
-- are not here: they are counted from calls and reviews.
create table if not exists habits (
  day               date primary key,
  listening_minutes int not null default 0 check (listening_minutes >= 0),
  updated_at        timestamptz default now()
);
