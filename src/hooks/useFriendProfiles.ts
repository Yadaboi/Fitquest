import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface FriendProfile {
  id: string
  displayName: string | null
  // null for a still-pending relationship — RLS only grants player_stats
  // once the friendship is accepted (see 0004_friends.sql). Callers must
  // not render stats for a pending entry, only for an accepted friend.
  totalXp: number | null
  streakWeeks: number | null
}

// friendships has two FKs, both pointing at auth.users, not profiles — so
// there's no FK PostgREST can embed for "whichever side isn't me." This
// resolves a set of other-user ids into display data via two follow-up
// queries instead, keyed by id for easy lookup.
export function useFriendProfiles(otherUserIds: string[]) {
  const sortedIds = [...otherUserIds].sort()
  const cacheKey = sortedIds.join(',')

  return useQuery({
    queryKey: ['friend-profiles', cacheKey],
    queryFn: async (): Promise<Record<string, FriendProfile>> => {
      const [{ data: profiles, error: profilesError }, { data: stats, error: statsError }] =
        await Promise.all([
          supabase.from('profiles').select('id, display_name').in('id', sortedIds),
          supabase
            .from('player_stats')
            .select('user_id, total_xp, streak_weeks')
            .in('user_id', sortedIds),
        ])
      if (profilesError) throw profilesError
      if (statsError) throw statsError

      const statsByUserId = new Map((stats ?? []).map((s) => [s.user_id, s]))
      const result: Record<string, FriendProfile> = {}
      for (const profile of profiles ?? []) {
        const stat = statsByUserId.get(profile.id)
        result[profile.id] = {
          id: profile.id,
          displayName: profile.display_name,
          totalXp: stat?.total_xp ?? null,
          streakWeeks: stat?.streak_weeks ?? null,
        }
      }
      return result
    },
    enabled: sortedIds.length > 0,
  })
}
