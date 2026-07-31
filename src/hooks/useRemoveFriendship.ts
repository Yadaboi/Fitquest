import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// One mutation covers three UI actions, same as the underlying RLS delete
// policy: declining an incoming request, cancelling an outgoing one, or
// unfriending an accepted one — the caller decides which button uses it.
export function useRemoveFriendship(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships', userId] })
    },
  })
}
