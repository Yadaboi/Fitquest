import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerStatsRow } from '../types/supabase'

export function usePlayerStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (error) throw error
      return data as PlayerStatsRow
    },
    enabled: !!userId,
  })
}
