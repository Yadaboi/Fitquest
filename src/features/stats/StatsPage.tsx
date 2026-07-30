import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory'
import { normalizeExerciseName } from '../../../shared/exercise-name'
import { getDayTypeCounts } from '../../lib/dayTypeStats'
import { ConsistencyHeatmap } from './ConsistencyHeatmap'
import { DayTypeCounts } from './DayTypeCounts'
import { StrengthLineChart, type ValuePoint } from './StrengthLineChart'

// Consistency heatmap is the hero visual; day-type counts are the "what kind
// of training" breakdown; per-exercise strength graphs are the drill-down
// layer below it.
export function StatsPage() {
  const { session } = useAuth()
  const { data: completedWorkouts } = useWorkoutHistory(session!.user.id)
  const workouts = completedWorkouts ?? []

  const dayTypeCounts = useMemo(() => getDayTypeCounts(workouts), [workouts])

  // Exercises are free-form now, so the charted list is derived from what
  // was actually logged (distinct normalized names among strength entries)
  // instead of iterating a fixed catalog. Whether an exercise reads as
  // "reps" or "kg" is inferred from whether any weight > 0 was ever logged
  // for it — there's no declared bodyweight flag to fall back on anymore.
  const exerciseSeries = useMemo(() => {
    const displayNameByKey = new Map<string, string>()
    for (const workout of workouts) {
      for (const s of workout.sets) {
        if (s.entry_type !== 'strength') continue
        displayNameByKey.set(normalizeExerciseName(s.exercise_name), s.exercise_name)
      }
    }

    return Array.from(displayNameByKey.entries()).map(([key, displayName]) => {
      const matchingSets = workouts.flatMap((w) =>
        w.sets.filter((s) => s.entry_type === 'strength' && normalizeExerciseName(s.exercise_name) === key),
      )
      const hasLoggedWeight = matchingSets.some((s) => (s.weight ?? 0) > 0)

      const points: ValuePoint[] = workouts
        .map((workout) => {
          const sets = workout.sets.filter(
            (s) => s.entry_type === 'strength' && normalizeExerciseName(s.exercise_name) === key,
          )
          if (sets.length === 0) return null
          const value = hasLoggedWeight
            ? Math.max(...sets.map((s) => s.weight ?? 0))
            : Math.max(...sets.map((s) => s.reps ?? 0))
          return { date: workout.date, value }
        })
        .filter((p): p is ValuePoint => p !== null)
        .sort((a, b) => a.date.localeCompare(b.date))

      return { key, name: displayName, points, unit: hasLoggedWeight ? 'kg' : ' reps' }
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
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Training split</p>
        <DayTypeCounts counts={dayTypeCounts} />
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Strength progress</p>
        {exerciseSeries.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Log a strength exercise to start seeing trends here.
          </p>
        ) : (
          exerciseSeries.map(({ key, name, points, unit }) => (
            <StrengthLineChart key={key} exerciseName={name} unit={unit} points={points} />
          ))
        )}
      </section>
    </div>
  )
}
