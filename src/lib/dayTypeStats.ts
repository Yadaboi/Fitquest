import { DAY_TYPES } from './recommendation'
import type { HistoryWorkout } from '../hooks/useWorkoutHistory'
import type { DayType } from '../types/domain'

// Simple tally of completed workouts per day type. Workouts logged before
// day types existed have day_type = null and don't count toward any bucket.
export function getDayTypeCounts(workouts: HistoryWorkout[]): Record<DayType, number> {
  const counts = Object.fromEntries(DAY_TYPES.map((d) => [d, 0])) as Record<DayType, number>
  for (const workout of workouts) {
    if (workout.day_type) counts[workout.day_type] += 1
  }
  return counts
}
