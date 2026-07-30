import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { normalizeExerciseName } from '../../shared/exercise-name'
import type { SetRow, WorkoutRow } from '../types/supabase'

export type HistorySet = Pick<
  SetRow,
  'id' | 'exercise_name' | 'entry_type' | 'weight' | 'reps' | 'duration_minutes' | 'is_pr'
>

export interface HistoryWorkout {
  id: WorkoutRow['id']
  date: WorkoutRow['date']
  day_type: WorkoutRow['day_type']
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
        .select('id, date, day_type, sets(id, exercise_name, entry_type, weight, reps, duration_minutes, is_pr)')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('date', { ascending: true })
      if (error) throw error
      return data as HistoryWorkout[]
    },
    enabled: !!userId,
  })
}

export function getLastPerformanceByExerciseName(
  workouts: HistoryWorkout[],
): Record<string, { weight: number; reps: number }> {
  const result: Record<string, { weight: number; reps: number }> = {}
  for (const workout of workouts) {
    for (const set of workout.sets) {
      if (set.entry_type !== 'strength' || set.weight == null || set.reps == null) continue
      // Workouts are ascending by date, so the last write wins = most recent.
      result[normalizeExerciseName(set.exercise_name)] = { weight: set.weight, reps: set.reps }
    }
  }
  return result
}

export function getLastCardioByActivityName(
  workouts: HistoryWorkout[],
): Record<string, { durationMinutes: number }> {
  const result: Record<string, { durationMinutes: number }> = {}
  for (const workout of workouts) {
    for (const set of workout.sets) {
      if (set.entry_type !== 'cardio' || set.duration_minutes == null) continue
      result[normalizeExerciseName(set.exercise_name)] = { durationMinutes: set.duration_minutes }
    }
  }
  return result
}
