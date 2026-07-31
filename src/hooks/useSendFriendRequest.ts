import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSendFriendRequest(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('send-friend-request', {
        body: { email },
      })
      if (error) {
        // Unlike completeWorkout's single generic failure message, this
        // function returns several distinct user-facing messages worth
        // showing exactly — but supabase-js puts a non-2xx response body
        // in error.context (the raw Response), not error.message, so it
        // has to be parsed out explicitly.
        const context = (error as { context?: Response }).context
        const body = context ? await context.json().catch(() => null) : null
        throw new Error(body?.error ?? error.message)
      }
      return data as { friendshipId: string; addresseeId: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships', userId] })
    },
  })
}
