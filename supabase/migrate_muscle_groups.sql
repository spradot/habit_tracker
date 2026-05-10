-- Migration: backfill muscle_groups on existing exercise_entries rows
-- Run once in the Supabase SQL editor.
-- Values are lowercase to match the MuscleGroup type in the app.

-- Abs / Core
update exercise_entries set muscle_groups = ARRAY['abs']
where name in ('Weighted Decline Crunch', 'Ab Crunch', 'Crunch', 'Decline Crunch',
               'Cable Crunch', 'Plank', 'Leg Raise', 'Hanging Leg Raise',
               'Russian Twist', 'Mountain Climber');

-- Chest (primary)
update exercise_entries set muscle_groups = ARRAY['chest', 'triceps', 'shoulders']
where name in ('Bench Press', 'Chest Press', 'Dumbbell Incline Press',
               'Incline Dumbbell Press', 'Incline Bench Press');

-- Chest (isolation / cable)
update exercise_entries set muscle_groups = ARRAY['chest']
where name in ('Cable Fly', 'Dumbbell Fly');

-- Chest + back
update exercise_entries set muscle_groups = ARRAY['chest', 'back']
where name in ('Chest Pull');

-- Back + biceps
update exercise_entries set muscle_groups = ARRAY['back', 'biceps']
where name in ('Lat Pulldown', 'Lat Pulldown Machine', 'Neutral-grip Pulldown',
               'Pull-ups', 'Pull-up', 'Barbell Row', 'Pendlay Row', 'Row Machine',
               'Cable Row', 'Unilateral Dumbbell Row', 'Dumbbell Row',
               'Seated Row', 'T-Bar Row');

-- Shoulders + triceps
update exercise_entries set muscle_groups = ARRAY['shoulders', 'triceps']
where name in ('Overhead Press', 'Overhead Dumbbell Press', 'OHP',
               'Military Press', 'Dumbbell Shoulder Press', 'Arnold Press');

-- Shoulders (isolation)
update exercise_entries set muscle_groups = ARRAY['shoulders']
where name in ('Lateral Raise', 'Lateral Raises', 'Front Raise');

-- Shoulders + back (rear delt)
update exercise_entries set muscle_groups = ARRAY['shoulders', 'back']
where name in ('Face Pull', 'Rear Delt Fly');

-- Biceps
update exercise_entries set muscle_groups = ARRAY['biceps']
where name in ('Barbell Curl', 'Bicep Barbell Curl', 'Z-Bar Curl', 'EZ Bar Curl',
               'Dumbbell Curl', 'Hammer Curl', 'Concentration Curl',
               'Cable Curl', 'Preacher Curl');

-- Triceps
update exercise_entries set muscle_groups = ARRAY['triceps']
where name in ('Tricep Pushdown', 'Tricep Pushdown (cable)', 'Tricep Extension',
               'French Press', 'Skullcrusher', 'Overhead Tricep Extension');

-- Triceps + chest
update exercise_entries set muscle_groups = ARRAY['triceps', 'chest']
where name in ('Tricep Dip', 'Close-Grip Bench Press', 'Dips', 'Weighted Push-ups', 'Push-ups');

-- Quads + glutes
update exercise_entries set muscle_groups = ARRAY['quads', 'glutes']
where name in ('Squat', 'Barbell Back Squat', 'Front Squat', 'Leg Press',
               'Lunges', 'Dumbbell Lunges', 'Bulgarian Split Squat', 'Hack Squat');

-- Quads (isolation)
update exercise_entries set muscle_groups = ARRAY['quads']
where name in ('Leg Extension', 'Seated Leg Contraction');

-- Hamstrings + glutes
update exercise_entries set muscle_groups = ARRAY['hamstrings', 'glutes']
where name in ('Romanian Deadlift', 'RDL', 'Good Morning', 'Hip Thrust');

-- Hamstrings (isolation)
update exercise_entries set muscle_groups = ARRAY['hamstrings']
where name in ('Leg Curl', 'Seated Leg Curl');

-- Full posterior chain
update exercise_entries set muscle_groups = ARRAY['hamstrings', 'glutes', 'back']
where name in ('Deadlift', 'Sumo Deadlift');

-- Calves
update exercise_entries set muscle_groups = ARRAY['calves']
where name in ('Calf Raise', 'Standing Calf Raise', 'Standing Calf Raises',
               'Seated Calf Raise');

-- Cardio
update exercise_entries set muscle_groups = ARRAY['cardio']
where name in ('Running', 'Treadmill', 'Cycling', 'Elliptical',
               'Jump Rope', 'HIIT', 'Swimming');

-- Verify: show any rows still missing muscle_groups after this migration
-- select id, name, muscle_groups from exercise_entries where muscle_groups = '{}' order by name;

-- ── Create exercises library table (run if not already applied via schema.sql) ─
create table if not exists exercises (
  id            text        primary key,
  name          text        not null unique,
  muscle_groups text[]               default '{}',
  category      text        not null default 'strength',
  created_at    timestamptz          default now()
);

create index if not exists exercises_name_idx on exercises (name);

alter table exercises enable row level security;
drop policy if exists "allow all" on exercises;
create policy "allow all" on exercises for all using (true) with check (true);
