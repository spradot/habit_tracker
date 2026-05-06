-- HabitTrack — Supabase schema
-- Run once in: Supabase → SQL Editor → Run
-- Safe to re-run (all statements use IF NOT EXISTS / IF EXISTS)

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists food_entries (
  id           text        primary key,
  date         text        not null,          -- YYYY-MM-DD
  time         text        not null,          -- HH:MM
  name         text        not null,
  calories     integer     not null default 0,
  protein      real        not null default 0,
  carbs        real        not null default 0,
  fat          real        not null default 0,
  serving_size real        not null default 0,
  barcode      text,
  created_at   timestamptz          default now()
);

create table if not exists exercise_entries (
  id           text        primary key,
  date         text        not null,
  name         text        not null,
  category     text        not null,          -- 'strength' | 'cardio' | 'mobility'
  sets         jsonb       not null default '[]', -- [{reps, weight, unit}]
  duration_min integer,                       -- cardio only
  notes        text,
  pr           boolean              default false,
  created_at   timestamptz          default now()
);

create table if not exists weight_entries (
  id           text        primary key,
  date         text        not null,
  time         text        not null,
  weight       real        not null,          -- always stored in kg
  notes        text,
  created_at   timestamptz          default now()
);

create table if not exists steps_entries (
  id           text        primary key,
  date         text        not null unique,   -- one entry per day
  steps        integer     not null,
  source       text                 default 'manual',
  created_at   timestamptz          default now()
);

-- ── Indexes (date is the most common query key) ───────────────────────────────

create index if not exists food_entries_date_idx     on food_entries     (date);
create index if not exists exercise_entries_date_idx on exercise_entries (date);
create index if not exists weight_entries_date_idx   on weight_entries   (date);
create index if not exists steps_entries_date_idx    on steps_entries    (date);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Single-user app. Anon key is kept private in .env (never committed).
-- Upgrade to auth.uid() policies if you add multi-user support later.

alter table food_entries     enable row level security;
alter table exercise_entries enable row level security;
alter table weight_entries   enable row level security;
alter table steps_entries    enable row level security;

drop policy if exists "allow all" on food_entries;
drop policy if exists "allow all" on exercise_entries;
drop policy if exists "allow all" on weight_entries;
drop policy if exists "allow all" on steps_entries;

create policy "allow all" on food_entries     for all using (true) with check (true);
create policy "allow all" on exercise_entries for all using (true) with check (true);
create policy "allow all" on weight_entries   for all using (true) with check (true);
create policy "allow all" on steps_entries    for all using (true) with check (true);
