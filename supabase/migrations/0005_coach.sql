-- FitQuest AI coach (Phase 9 design).
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Additive, like 0003/0004: this project has real logged user data.
-- One new table only.
--
-- Two-role, two-write-path table, same anti-cheat shape as
-- player_stats/xp_events/user_achievements: the user may insert their own
-- questions (role = 'user'), but only the coach-chat Edge Function, using
-- the service role, may ever write what the coach "said" (role =
-- 'assistant'). A client can never forge a coach reply.
create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  -- Only meaningful for assistant rows: did the user ask something ('chat'),
  -- or did the coach speak first right after a workout ('post_workout')?
  source text not null default 'chat' check (source in ('chat', 'post_workout')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index coach_messages_user_created_idx on public.coach_messages (user_id, created_at);

alter table public.coach_messages enable row level security;

create policy "select own coach messages" on public.coach_messages
  for select using (auth.uid() = user_id);

create policy "insert own user coach messages" on public.coach_messages
  for insert with check (auth.uid() = user_id and role = 'user');
-- No policy permits a role = 'assistant' insert — only coach-chat (service
-- role, bypasses RLS) may write those. The app's actual chat flow routes
-- even the user's own messages through the Edge Function anyway, so the
-- hourly rate limit is checked before the row exists, not after.

-- No update/delete policy at all — immutable transcript, same as xp_events.
