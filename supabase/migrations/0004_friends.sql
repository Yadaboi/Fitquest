-- FitQuest friends (Phase 8 design).
-- Run this once in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Additive, like 0003: this project has real logged user data. Nothing
-- here drops or rewrites an existing table; profiles gets one new
-- nullable column, and friendships is a brand-new table.
--
-- This is the app's first feature where one user can ever see another
-- user's data. Every RLS policy below was written and then specifically
-- reviewed for that reason — see the comments on the accept-request
-- policy and the update grant in particular.

-- ============================================================
-- profiles: add a nullable, user-editable display name. No email column
-- is added here — auth.users.email never enters the public schema. The
-- email->id lookup used by the friend-request flow stays entirely
-- server-side (see get_user_id_by_email below); it is never duplicated
-- into a client-readable table.
-- ============================================================
alter table public.profiles
  add column display_name text check (char_length(display_name) <= 40);

-- ============================================================
-- friendships: one row per relationship between two users, regardless of
-- who requested it. requester_id/addressee_id are fixed at creation and
-- must never change afterward — enforced below via a restricted UPDATE
-- grant, not just RLS (see the comment on that grant for why RLS alone
-- isn't enough).
-- ============================================================
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self_friend check (requester_id <> addressee_id)
);

-- At most one relationship row between any two users, regardless of
-- direction or status. This is what actually prevents: A requesting B
-- twice, A and B simultaneously requesting each other, and A re-requesting
-- B while already friends. A fresh request is only possible again once the
-- existing row is deleted (decline/cancel/unfriend all delete the row).
create unique index friendships_unique_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "select own friendships" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- No insert policy for `authenticated` on purpose — inserting requires the
-- email->id lookup, which requires the service role. Only the
-- send-friend-request Edge Function may create rows, mirroring the
-- player_stats/xp_events/user_achievements anti-cheat boundary in
-- 0001/0002: a client can never write this table directly.

create policy "addressee can accept a pending request" on public.friendships
  for update
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id and status = 'accepted');

-- Table-level grants in Supabase are wide open by default for
-- `authenticated` (RLS is the real gate) — narrow UPDATE to exactly the
-- two columns the policy above is meant to allow. Without this, the RLS
-- `with check` above only validates addressee_id/status and never
-- inspects requester_id, so a malicious addressee could smuggle a
-- rewritten requester_id into the same UPDATE statement and hijack an
-- unrelated pending row to forge a friendship with someone who never
-- asked for one. This grant closes that.
revoke update on public.friendships from authenticated;
grant update (status, responded_at) on public.friendships to authenticated;

create policy "either party can delete a friendship" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);
-- Covers three UI actions with the same policy: addressee declines a
-- pending request, requester cancels a pending request, either party
-- unfriends an accepted one.

-- ============================================================
-- Friend-scoped visibility helpers. Both are `security invoker` (the
-- default) — they only rely on the calling user's own already-granted
-- SELECT access on friendships ("select own friendships" above), so no
-- privilege escalation is needed or wanted here.
-- ============================================================
create function public.has_accepted_friendship(other_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = other_user_id)
        or (f.addressee_id = auth.uid() and f.requester_id = other_user_id))
  );
$$;

-- Deliberately wider than the above: also true for a still-pending request
-- in either direction, so an addressee can see *who* is asking before they
-- accept, and a requester can see the name of the person they just
-- messaged. This does not leak new information — completing a send only
-- succeeds once the requester already knows the target account exists.
-- player_stats (XP/streak) stays strictly accepted-only below.
create function public.has_friendship_or_pending(other_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = other_user_id)
       or (f.addressee_id = auth.uid() and f.requester_id = other_user_id)
  );
$$;

create policy "friends can view display name" on public.profiles
  for select using (public.has_friendship_or_pending(id));

create policy "friends can view player stats" on public.player_stats
  for select using (public.has_accepted_friendship(user_id));
-- Additive alongside the existing "select own ..." policies on both
-- tables — Postgres combines multiple permissive policies for the same
-- command with OR, so own-row access is untouched.

-- ============================================================
-- get_user_id_by_email: the only place an email is ever resolved to a
-- user id. SECURITY DEFINER so it can read auth.users (never exposed to
-- PostgREST directly); locked to service_role only so no authenticated
-- client can call it to enumerate accounts by email — only the
-- send-friend-request Edge Function may call it, itself rate-limited.
-- ============================================================
create function public.get_user_id_by_email(lookup_email text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to service_role;

-- Before running this migration: check whether this project's auth.users
-- has a deleted_at/banned_until column —
--   select column_name from information_schema.columns
--   where table_schema = 'auth' and table_name = 'users';
-- — if so, add `and deleted_at is null` to the query above as a one-line
-- follow-up so a soft-deleted/banned account can't be friend-requested.
