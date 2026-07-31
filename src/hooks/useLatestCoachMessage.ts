import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CoachMessageRow } from '../types/supabase'

// Just the most recent message, for the Home page teaser card — separate
// query key from useCoachMessages so the Home card doesn't have to fetch
// (and re-render on) the full transcript.
export function useLatestCoachMessage(userId: string | undefined) {
  return useQuery({
    queryKey: ['coach-messages-latest', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as CoachMessageRow | null
    },
    enabled: !!userId,
  })
}
