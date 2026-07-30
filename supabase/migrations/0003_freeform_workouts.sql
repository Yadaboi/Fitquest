-- FitQuest free-form workout logging (Phase 7 design).
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
--
-- UNLIKE 0001/0002, this migration is NOT a drop-and-recreate: workouts and
-- sets now hold real logged history, so everything here is an additive
-- ALTER TABLE (plus one backfill UPDATE). Only `exercises` — a fixed 4-row
-- content table with no user data — gets dropped, and only at the very end,
-- once nothing references it anymore.

-- ============================================================
-- workouts: add day_type. Nullable — existing rows predate the concept
-- and stay valid with no backfill; every new workout going forward always
-- sets this at creation time.
-- ============================================================
alter table public.workouts
  add column day_type text
    check (day_type in ('upper', 'lower', 'push', 'pull', 'legs', 'cardio'));

-- ============================================================
-- sets: generalize from "fixed-catalog strength set" to
-- "free-form strength set OR cardio entry".
-- ============================================================

-- Step 1: add the free-text name column and backfill it from the catalog
-- while `exercises` still exists, so historical rows read "Goblet Squat"
-- instead of the raw slug "goblet-squat".
alter table public.sets add column exercise_name text;

update public.sets s
set exercise_name = e.name
from public.exercises e
where e.id = s.exercise_id;

-- Sanity check before proceeding — every row should now have a name.
-- If this returns > 0, stop and investigate before continuing:
--   select count(*) from public.sets where exercise_name is null;

alter table public.sets alter column exercise_name set not null;

-- Step 2: drop the FK + old column now that exercise_name has taken over.
-- Postgres's default name for an inline `references` constraint is
-- <table>_<column>_fkey; confirm first if this project ever renamed it:
--   select conname from pg_constraint where conrelid = 'public.sets'::regclass;
alter table public.sets drop constraint sets_exercise_id_fkey;
alter table public.sets drop column exercise_id;

-- Step 3: relax weight/reps to support cardio rows (no weight/reps), add
-- duration_minutes for cardio, and add entry_type to disambiguate.
-- Dropping weight's default is required, not cosmetic: a cardio insert
-- omits weight entirely, and the old "default 0" would otherwise silently
-- turn that into 0 instead of NULL, violating the shape check below.
alter table public.sets alter column weight drop not null;
alter table public.sets alter column weight drop default;
alter table public.sets alter column reps drop not null;
alter table public.sets add column duration_minutes int;

alter table public.sets
  add column entry_type text not null default 'strength'
    check (entry_type in ('strength', 'cardio'));
-- The default correctly backfills every existing row: all historical sets
-- predate cardio logging, so they're all genuinely 'strength'.

-- Step 4: enforce the two valid row shapes so a future bug can't insert a
-- half-populated row (e.g. a cardio entry that's missing its duration).
alter table public.sets
  add constraint sets_entry_shape_check check (
    (entry_type = 'strength' and weight is not null and reps is not null and duration_minutes is null)
    or
    (entry_type = 'cardio' and duration_minutes is not null and weight is null and reps is null)
  );

-- ============================================================
-- exercises: no longer referenced by anything (FK dropped above, and
-- the app no longer has a fixed catalog). Safe to drop — fixed content
-- table, holds no user rows, and its own "public read" policy goes with it.
-- ============================================================
drop table public.exercises;
