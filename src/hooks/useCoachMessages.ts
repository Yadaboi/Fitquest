import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CoachMessageRow } from '../types/supabase'

export function useCoachMessages(userId: string | undefined) {
  return useQuery({
    queryKey: ['coach-messages', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(200)
      if (error) throw error
      return data as CoachMessageRow[]
    },
    enabled: !!userId,
  })
}
