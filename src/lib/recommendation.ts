import type { HistoryWorkout } from '../hooks/useWorkoutHistory'
import type { DayType } from '../types/domain'

// Fixed iteration order so ties (e.g. two day types both "never trained")
// resolve the same way every time instead of depending on Map insertion order.
export const DAY_TYPES: DayType[] = ['upper', 'lower', 'push', 'pull', 'legs', 'cardio']

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  cardio: 'Cardio',
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface FocusRecommendation {
  dayType: DayType
  daysSinceTrained: number | null // null = never logged this day type
  message: string
}

// v1 coach logic (history-only): recommends the day type that's gone
// longest without a logged session. Reads workouts.day_type directly (set
// at logging time) rather than inferring a category from exercise names —
// simpler and more accurate than trying to reverse-engineer intent from
// free-typed exercise names. Deliberately doesn't factor in soreness,
// sleep, or other recovery signals — the app doesn't collect that data yet,
// and fabricating a "recovery score" from nothing would just be noise
// dressed up as insight. Returns null when there's no history yet, or when
// every day type was touched within the last day (nothing meaningfully overdue).
export function getFocusRecommendation(
  history: HistoryWorkout[],
  today: Date = new Date(),
): FocusRecommendation | null {
  if (history.length === 0) return null

  const lastTrainedByDayType = new Map<DayType, Date>()
  for (const workout of history) {
    if (!workout.day_type) continue // legacy workouts predate day types — skip, don't guess
    const workoutDate = new Date(workout.date)
    const current = lastTrainedByDayType.get(workout.day_type)
    if (!current || workoutDate > current) lastTrainedByDayType.set(workout.day_type, workoutDate)
  }
  if (lastTrainedByDayType.size === 0) return null

  let focusDayType: DayType | null = null
  let maxDays = -Infinity
  for (const dayType of DAY_TYPES) {
    const lastTrained = lastTrainedByDayType.get(dayType)
    const days = lastTrained
      ? Math.floor((today.getTime() - lastTrained.getTime()) / MS_PER_DAY)
      : Infinity
    if (days > maxDays) {
      maxDays = days
      focusDayType = dayType
    }
  }
  if (!focusDayType) return null

  // Everything's been touched within the last day — nothing overdue enough
  // to call out, so stay quiet rather than manufacture urgency.
  if (maxDays <= 1) return null

  const daysSinceTrained = Number.isFinite(maxDays) ? maxDays : null
  const label = DAY_TYPE_LABELS[focusDayType]
  const message =
    daysSinceTrained === null
      ? `You haven't logged a ${label} day yet — today's a good day to start.`
      : `You haven't trained ${label} in ${daysSinceTrained} days — today's a good day to prioritize it.`

  return { dayType: focusDayType, daysSinceTrained, message }
}
