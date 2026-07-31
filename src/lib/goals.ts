import type { HistoryWorkout } from '../hooks/useWorkoutHistory'

export interface WeeklyGoalProgress {
  completed: number
  goal: number
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() || 7 // Sunday (0) -> 7, so Monday is always day 1
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (day - 1))
  return d
}

// How many workouts have been completed since this week's Monday, against
// the weekly_goal set on the profile (editable on the Profile page).
export function getWeeklyGoalProgress(
  history: HistoryWorkout[],
  weeklyGoal: number,
  today: Date = new Date(),
): WeeklyGoalProgress {
  const weekStart = startOfWeek(today)
  const completed = history.filter((w) => new Date(w.date) >= weekStart).length
  return { completed, goal: weeklyGoal }
}
