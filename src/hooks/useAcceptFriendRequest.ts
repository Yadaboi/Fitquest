import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Direct RLS-protected write, no Edge Function needed — the "addressee can
// accept a pending request" policy (0004_friends.sql) already permits
// exactly this transition, with the column-level grant fix ensuring only
// status/responded_at can ever change.
export function useAcceptFriendRequest(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', friendshipId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships', userId] })
    },
  })
}
