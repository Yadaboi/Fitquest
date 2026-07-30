// In-session UI shapes for the workout currently being logged (camelCase,
// not yet persisted). DB row shapes live in types/supabase.ts instead.

export type DayType = 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'cardio'

export interface LoggedStrengthEntry {
  id: string
  entryType: 'strength'
  exerciseName: string
  weight: number
  reps: number
  isPr: boolean
}

export interface LoggedCardioEntry {
  id: string
  entryType: 'cardio'
  exerciseName: string // the activity, e.g. "Running"
  durationMinutes: number
  isPr: boolean
}

export type LoggedEntry = LoggedStrengthEntry | LoggedCardioEntry

export interface SessionQuest {
  id: string
  title: string
  isComplete: boolean
}
