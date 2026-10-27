import { normalizeExerciseName } from './exercise-name.ts'
import type { CoachWorkout } from './workout-shape.ts'

export interface LiftBest {
  weight: number
  reps: number
}

export interface TrackedBests {
  bench: LiftBest | null
  squat: LiftBest | null
  deadlift: LiftBest | null
  mileRunMinutes: number | null // fastest (lowest) time, unlike other cardio where more is better
}

// The four "max holder" lifts the Stats page always tracks, matched by
// normalized exercise name — log a set as "Bench" (or "bench", "BENCH")
// for it to count. A best is the single highest-weight set ever logged for
// that lift, shown together with its rep count rather than just the raw
// weight, so it still means something to someone training for volume
// instead of a true one-rep max.
const TRACKED_LIFTS = {
  bench: 'Bench',
  squat: 'Squat',
  deadlift: 'Deadlift',
} as const

const MILE_RUN_KEY = normalizeExerciseName('Mile Run')

export function getTrackedBests(workouts: CoachWorkout[]): TrackedBests {
  const liftKeyByNormalizedName = new Map(
    Object.entries(TRACKED_LIFTS).map(([key, name]) => [normalizeExerciseName(name), key]),
  )

  const bestByLift: Record<string, LiftBest | null> = { bench: null, squat: null, deadlift: null }
  let mileRunMinutes: number | null = null

  for (const workout of workouts) {
    for (const set of workout.sets) {
      const key = normalizeExerciseName(set.exercise_name)

      if (set.entry_type === 'strength' && set.weight != null && set.reps != null) {
        const liftKey = liftKeyByNormalizedName.get(key)
        if (!liftKey) continue
        const current = bestByLift[liftKey]
        if (!current || set.weight > current.weight) {
          bestByLift[liftKey] = { weight: set.weight, reps: set.reps }
        }
      } else if (
        set.entry_type === 'cardio' &&
        set.duration_minutes != null &&
        key === MILE_RUN_KEY
      ) {
        if (mileRunMinutes === null || set.duration_minutes < mileRunMinutes) {
          mileRunMinutes = set.duration_minutes
        }
      }
    }
  }

  return {
    bench: bestByLift.bench,
    squat: bestByLift.squat,
    deadlift: bestByLift.deadlift,
    mileRunMinutes,
  }
}

export function formatMileTime(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
