import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { SetRow, WorkoutRow } from '../types/supabase'

export type HistorySet = Pick<SetRow, 'id' | 'exercise_id' | 'weight' | 'reps' | 'is_pr'>

export interface HistoryWorkout {
  id: WorkoutRow['id']
  date: WorkoutRow['date']
  sets: HistorySet[]
}

// Only completed workouts count as history — an abandoned session never
// went through completeWorkout, so it never earned real XP/PRs either.
export function useWorkoutHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['workout-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, date, sets(id, exercise_id, weight, reps, is_pr)')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('date', { ascending: true })
      if (error) throw error
      return data as HistoryWorkout[]
    },
    enabled: !!userId,
  })
}

export function getLastPerformanceByExercise(
  workouts: HistoryWorkout[],
): Record<string, { weight: number; reps: number }> {
  const result: Record<string, { weight: number; reps: number }> = {}
  for (const workout of workouts) {
    for (const set of workout.sets) {
      // Workouts are ascending by date, so the last write wins = most recent.
      result[set.exercise_id] = { weight: set.weight, reps: set.reps }
    }
  }
  return result
}
