-- FitQuest achievements persistence (Phase 6 design).
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- Additive: does not touch any table from 0001_init.sql.

drop table if exists public.user_achievements cascade;

-- ============================================================
-- user_achievements: durable unlock record per achievement, one row per
-- (user, achievement) holding the highest tier reached. No insert/update
-- policy is granted to the authenticated role on purpose — only the
-- completeWorkout Edge Function (service role) may write here, same
-- anti-cheat boundary as player_stats and xp_events.
-- ============================================================
create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  tier_index int not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy "select own achievements" on public.user_achievements
  for select using (auth.uid() = user_id);
