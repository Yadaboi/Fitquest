import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ProfileRow } from '../types/supabase'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data as ProfileRow
    },
    enabled: !!userId,
  })
}

export function useUpdateProfile(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      updates: Pick<ProfileRow, 'experience_level' | 'weekly_goal'> &
        Partial<Pick<ProfileRow, 'display_name'>>,
    ) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}
