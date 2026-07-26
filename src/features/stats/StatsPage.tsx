import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory'
import { EXERCISE_LIBRARY } from '../../lib/mockData'
import { ConsistencyHeatmap } from './ConsistencyHeatmap'
import { StrengthLineChart, type ValuePoint } from './StrengthLineChart'

// Consistency heatmap is the hero visual; per-exercise strength graphs are the drill-down layer below it.
export function StatsPage() {
  const { session } = useAuth()
  const { data: completedWorkouts } = useWorkoutHistory(session!.user.id)
  const workouts = completedWorkouts ?? []

  const exerciseSeries = useMemo(() => {
    return EXERCISE_LIBRARY.map((exercise) => {
      const points: ValuePoint[] = workouts
        .map((workout) => {
          const sets = workout.sets.filter((s) => s.exercise_id === exercise.id)
          if (sets.length === 0) return null
          const value = exercise.isBodyweight
            ? Math.max(...sets.map((s) => s.reps))
            : Math.max(...sets.map((s) => s.weight))
          return { date: workout.date, value }
        })
        .filter((p): p is ValuePoint => p !== null)
        .sort((a, b) => a.date.localeCompare(b.date))

      return {
        exercise,
        points,
        unit: exercise.isBodyweight ? ' reps' : 'kg',
      }
    })
  }, [workouts])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">Stats</h1>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {workouts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Your consistency heatmap will fill in as you log workouts.
          </p>
        ) : (
          <ConsistencyHeatmap workouts={workouts} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Strength progress</p>
        {exerciseSeries.map(({ exercise, points, unit }) => (
          <StrengthLineChart
            key={exercise.id}
            exerciseName={exercise.name}
            unit={unit}
            points={points}
          />
        ))}
      </section>
    </div>
  )
}
