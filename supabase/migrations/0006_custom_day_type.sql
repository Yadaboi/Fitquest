-- FitQuest custom (free-form) day type — for sessions that don't fit any
-- fixed split, e.g. "shoulders and legs."
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.

alter table public.workouts drop constraint workouts_day_type_check;
alter table public.workouts
  add constraint workouts_day_type_check
    check (day_type in ('upper', 'lower', 'push', 'pull', 'legs', 'cardio', 'custom'));

-- Free-text label the user types for a custom day (e.g. "Shoulders & Legs").
-- Only meaningful when day_type = 'custom' — enforced below rather than left
-- to convention, same as the sets shape check in 0003.
alter table public.workouts add column custom_label text;

alter table public.workouts
  add constraint workouts_custom_label_shape_check check (
    (day_type = 'custom' and custom_label is not null and length(trim(custom_label)) > 0)
    or
    (day_type is distinct from 'custom' and custom_label is null)
  );
