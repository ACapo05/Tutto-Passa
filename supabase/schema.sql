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
  kind             text not null check (kind in ('mistake','vocab')),
  item_key         text not null,            -- stable slug; this is what decides new vs repeat
  you_said         text,
  correct_form     text,
  note             text,
  first_seen       date default current_date,
  last_reviewed    date,
  next_due         date default current_date,
  interval_days    int  default 1,
  recurrence_count int  default 1,
  unique (language, kind, item_key)
);

create index if not exists items_due_idx on items (language, next_due);

create table if not exists push_subscriptions (
  endpoint     text primary key,
  subscription jsonb not null,
  created_at   timestamptz default now()
);
