import { EXERCISE_LIBRARY } from './mockData'
import type { HistoryWorkout } from '../hooks/useWorkoutHistory'
import type { Exercise } from '../types/domain'

export type ExerciseCategory = Exercise['category']

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  push: 'push',
  pull: 'pull',
  legs: 'legs',
  core: 'core',
}

// Fixed iteration order so ties (e.g. two categories both "never trained")
// resolve the same way every time instead of depending on Map insertion order.
const CATEGORY_ORDER: ExerciseCategory[] = ['legs', 'push', 'pull', 'core']

const CATEGORY_BY_EXERCISE_ID = new Map(EXERCISE_LIBRARY.map((e) => [e.id, e.category]))

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface FocusRecommendation {
  category: ExerciseCategory
  daysSinceTrained: number | null // null = never logged a set in this category
  message: string
}

// v1 coach logic (history-only): recommends the category that's gone
// longest without a logged set. Deliberately doesn't factor in soreness,
// sleep, or other recovery signals — the app doesn't collect that data yet,
// and fabricating a "recovery score" from nothing would just be noise
// dressed up as insight. Returns null when there's no history yet, or when
// every category was touched within the last day (nothing meaningfully overdue).
export function getFocusRecommendation(
  history: HistoryWorkout[],
  today: Date = new Date(),
): FocusRecommendation | null {
  if (history.length === 0) return null

  const lastTrainedByCategory = new Map<ExerciseCategory, Date>()
  for (const workout of history) {
    const workoutDate = new Date(workout.date)
    for (const set of workout.sets) {
      const category = CATEGORY_BY_EXERCISE_ID.get(set.exercise_id)
      if (!category) continue
      const current = lastTrainedByCategory.get(category)
      if (!current || workoutDate > current) lastTrainedByCategory.set(category, workoutDate)
    }
  }

  let focusCategory: ExerciseCategory | null = null
  let maxDays = -Infinity
  for (const category of CATEGORY_ORDER) {
    const lastTrained = lastTrainedByCategory.get(category)
    const days = lastTrained
      ? Math.floor((today.getTime() - lastTrained.getTime()) / MS_PER_DAY)
      : Infinity
    if (days > maxDays) {
      maxDays = days
      focusCategory = category
    }
  }
  if (!focusCategory) return null

  // Everything's been touched within the last day — nothing overdue enough
  // to call out, so stay quiet rather than manufacture urgency.
  if (maxDays <= 1) return null

  const daysSinceTrained = Number.isFinite(maxDays) ? maxDays : null
  const label = CATEGORY_LABELS[focusCategory]
  const message =
    daysSinceTrained === null
      ? `You haven't logged a ${label} exercise yet — today's a good day to start.`
      : `You haven't trained ${label} in ${daysSinceTrained} days — today's a good day to prioritize it.`

  return { category: focusCategory, daysSinceTrained, message }
}
