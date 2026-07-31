import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FriendshipRow } from '../types/supabase'

// Raw friendship rows where the user is either side — pending or accepted,
// sent or received. Splitting into friends/incoming/outgoing happens in
// useFriendsList, which also resolves the "other side" of each row.
export function useFriendships(userId: string | undefined) {
  return useQuery({
    queryKey: ['friendships', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as FriendshipRow[]
    },
    enabled: !!userId,
  })
}
