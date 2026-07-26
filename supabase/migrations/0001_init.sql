-- FitQuest initial schema (Phase 4 design).
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: drops any existing FitQuest objects first (fine on a fresh
-- project with no real data yet), then recreates everything from scratch.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.xp_events cascade;
drop table if exists public.sets cascade;
drop table if exists public.workouts cascade;
drop table if exists public.exercises cascade;
drop table if exists public.player_stats cascade;
drop table if exists public.profiles cascade;

-- ============================================================
-- profiles: client-editable settings only (weekly goal, experience level).
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  experience_level text check (experience_level in ('new', 'returning')),
  weekly_goal int not null default 3,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- player_stats: server-authoritative game state (XP, streak, shields).
-- No insert/update policy is granted to the authenticated role on purpose —
-- only the completeWorkout Edge Function (using the service role, which
-- bypasses RLS) may write here. This is the anti-cheat boundary from
-- Phase 5: a client can never self-report its own XP total.
-- ============================================================
create table public.player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp int not null default 0,
  streak_weeks int not null default 0,
  shield_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.player_stats enable row level security;

create policy "select own stats" on public.player_stats
  for select using (auth.uid() = user_id);

-- ============================================================
-- exercises: the shared content library. Public read, no client writes —
-- content is managed by us directly (service role / dashboard).
-- ============================================================
create table public.exercises (
  id text primary key,
  name text not null,
  category text not null check (category in ('push', 'pull', 'legs', 'core')),
  cue text not null,
  is_bodyweight boolean not null default false
);

alter table public.exercises enable row level security;

create policy "public read exercises" on public.exercises
  for select using (true);

insert into public.exercises (id, name, category, cue, is_bodyweight) values
  ('goblet-squat', 'Goblet Squat', 'legs', 'Hold weight at your chest, sit back and down, chest up.', false),
  ('push-up', 'Push-Up', 'push', 'Hands under shoulders, keep a straight line from head to heels.', true),
  ('dumbbell-row', 'Dumbbell Row', 'pull', 'Flat back, pull the weight to your hip, squeeze at the top.', false),
  ('plank', 'Plank', 'core', 'Forearms down, straight line head to heels, brace your core.', true);

-- ============================================================
-- workouts: a logged session.
-- ============================================================
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;

create policy "select own workouts" on public.workouts
  for select using (auth.uid() = user_id);

create policy "insert own workouts" on public.workouts
  for insert with check (auth.uid() = user_id);

create policy "update own workouts" on public.workouts
  for update using (auth.uid() = user_id);

-- ============================================================
-- sets: belongs to a workout + exercise. Ownership is checked via the
-- parent workout since sets have no user_id column of their own.
-- ============================================================
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  weight numeric not null default 0,
  reps int not null,
  is_pr boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.sets enable row level security;

create policy "select own sets" on public.sets
  for select using (
    exists (
      select 1 from public.workouts w
      where w.id = sets.workout_id and w.user_id = auth.uid()
    )
  );

create policy "insert own sets" on public.sets
  for insert with check (
    exists (
      select 1 from public.workouts w
      where w.id = sets.workout_id and w.user_id = auth.uid()
    )
  );

-- ============================================================
-- xp_events: append-only audit log backing player_stats.total_xp.
-- Same anti-cheat boundary as player_stats: no client insert policy.
-- ============================================================
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount int not null,
  source text not null check (source in ('set', 'completion', 'pr', 'quest')),
  created_at timestamptz not null default now()
);

alter table public.xp_events enable row level security;

create policy "select own xp events" on public.xp_events
  for select using (auth.uid() = user_id);

-- ============================================================
-- Auto-provision profile + player_stats rows when a new user signs up.
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.player_stats (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
