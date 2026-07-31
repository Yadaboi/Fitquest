import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSendCoachMessage(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: { trigger: 'chat', message },
      })
      if (error) {
        // Same gotcha as useSendFriendRequest: supabase-js puts a non-2xx
        // response body in error.context (the raw Response), not
        // error.message — has to be parsed out explicitly to surface the
        // coach's specific rate-limit/config/API-failure messages.
        const context = (error as { context?: Response }).context
        const body = context ? await context.json().catch(() => null) : null
        throw new Error(body?.error ?? error.message)
      }
      return data as { reply: string; messageId: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-messages', userId] })
      queryClient.invalidateQueries({ queryKey: ['coach-messages-latest', userId] })
    },
  })
}
