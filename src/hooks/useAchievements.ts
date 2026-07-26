import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { UserAchievementRow } from '../types/supabase'

// Durable unlock records written by the complete-workout edge function.
// Distinct from the live progress bars on the Profile page (those are
// recomputed from workout history on every render) — this is the
// persisted "you unlocked this, and when" fact.
export function useAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['achievements', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return data as UserAchievementRow[]
    },
    enabled: !!userId,
  })
}
