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
  id            text        primary key,
  date          text        not null,
  name          text        not null,
  category      text        not null,             -- 'strength' | 'cardio' | 'mobility'
  sets          jsonb       not null default '[]', -- [{reps, weight, unit, durationSec?}]
  muscle_groups text[]               default '{}', -- derived from exercise name
  duration_min  integer,                           -- cardio only
  notes         text,
  pr            boolean              default false,
  created_at    timestamptz          default now()
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

create table if not exists workout_plans (
  id           text        primary key,
  name         text        not null,
  schedule     jsonb       not null default '{}', -- {dow: templateId}
  templates    jsonb       not null default '[]', -- WorkoutTemplate[]
  floating     boolean              default true, -- true = match by exercise overlap, not fixed days
  active       boolean              default false,
  created_at   timestamptz          default now()
);

create table if not exists body_measurements (
  id                  text        primary key,
  date                text        not null,       -- YYYY-MM-DD
  waist_cm            real,
  belly_cm            real,                       -- navel level
  chest_cm            real,
  left_arm_cm         real,
  right_arm_cm        real,
  hips_and_buttocks_cm real,
  notes               text,
  created_at          timestamptz                 default now()
);

create table if not exists sleep_entries (
  id             text        primary key,
  date           text        not null unique,     -- wake-up date, one entry per day
  bedtime_iso    text        not null,            -- full ISO timestamp
  wake_iso       text        not null,            -- full ISO timestamp
  quality_score  smallint    check (quality_score between 1 and 5),
  notes          text,
  created_at     timestamptz                      default now()
);

create table if not exists exercises (
  id            text        primary key,
  name          text        not null unique,          -- display name, unique per library
  muscle_groups text[]               default '{}',
  category      text        not null default 'strength', -- 'strength' | 'cardio' | 'mobility'
  created_at    timestamptz          default now()
);

create table if not exists day_scores (
  date                    text    primary key,    -- YYYY-MM-DD
  points                  integer not null default 0,
  steps_points            integer not null default 0,
  exercise_points         integer not null default 0,
  calorie_points          integer not null default 0,
  pr_points               integer not null default 0,
  plan_compliance_points  integer not null default 0,
  streak_bonus            integer not null default 0,
  updated_at              timestamptz             default now()
);

-- ── Indexes (date is the most common query key) ───────────────────────────────

create index if not exists food_entries_date_idx         on food_entries         (date);
create index if not exists exercise_entries_date_idx     on exercise_entries     (date);
create index if not exists weight_entries_date_idx       on weight_entries       (date);
create index if not exists steps_entries_date_idx        on steps_entries        (date);
create index if not exists body_measurements_date_idx    on body_measurements    (date);
create index if not exists sleep_entries_date_idx        on sleep_entries        (date);
create index if not exists day_scores_date_idx           on day_scores           (date);
create index if not exists exercises_name_idx            on exercises            (name);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Single-user app. Anon key is kept private in .env (never committed).
-- Upgrade to auth.uid() policies if you add multi-user support later.

alter table food_entries       enable row level security;
alter table exercise_entries   enable row level security;
alter table weight_entries     enable row level security;
alter table steps_entries      enable row level security;
alter table workout_plans      enable row level security;
alter table body_measurements  enable row level security;
alter table sleep_entries      enable row level security;
alter table day_scores         enable row level security;
alter table exercises          enable row level security;

drop policy if exists "allow all" on food_entries;
drop policy if exists "allow all" on exercise_entries;
drop policy if exists "allow all" on weight_entries;
drop policy if exists "allow all" on steps_entries;
drop policy if exists "allow all" on workout_plans;
drop policy if exists "allow all" on body_measurements;
drop policy if exists "allow all" on sleep_entries;
drop policy if exists "allow all" on day_scores;
drop policy if exists "allow all" on exercises;

create policy "allow all" on food_entries      for all using (true) with check (true);
create policy "allow all" on exercise_entries  for all using (true) with check (true);
create policy "allow all" on weight_entries    for all using (true) with check (true);
create policy "allow all" on steps_entries     for all using (true) with check (true);
create policy "allow all" on workout_plans     for all using (true) with check (true);
create policy "allow all" on body_measurements for all using (true) with check (true);
create policy "allow all" on sleep_entries     for all using (true) with check (true);
create policy "allow all" on day_scores        for all using (true) with check (true);
create policy "allow all" on exercises         for all using (true) with check (true);

-- ── Migrations (run once against existing tables) ─────────────────────────────

-- Add muscle_groups column if upgrading from a schema without it
alter table exercise_entries
  add column if not exists muscle_groups text[] default '{}';

-- Also updates the sets comment to reflect the durationSec? field added for timed sets
-- (no structural change needed — sets is jsonb and already accepts the new field)
