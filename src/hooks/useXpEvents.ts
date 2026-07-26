import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { XpEventRow } from '../types/supabase'

// Recent entries from the append-only audit log the complete-workout edge
// function writes on every award — gives users a legible answer to "why
// did my XP change."
export function useXpEvents(userId: string | undefined) {
  return useQuery({
    queryKey: ['xp-events', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as XpEventRow[]
    },
    enabled: !!userId,
  })
}
