// Structural shapes shared between the Vite client and Deno edge functions
// for "a completed workout with its sets." Deliberately depends on nothing
// but plain fields — src/hooks/useWorkoutHistory.ts's HistoryWorkout/
// HistorySet already satisfy these shapes exactly, so passing history
// straight into any shared/*.ts function that expects CoachWorkout[] just
// type-checks, no client-side conversion needed.

export type DayType = 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'cardio' | 'custom'

export interface CoachSet {
  id: string
  exercise_name: string
  entry_type: 'strength' | 'cardio'
  weight: number | null
  reps: number | null
  duration_minutes: number | null
  is_pr: boolean
}

export interface CoachWorkout {
  id: string
  date: string
  day_type: DayType | null
  sets: CoachSet[]
}
