import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory'
import { getDayTypeCounts } from '../../lib/dayTypeStats'
import { getTrackedBests } from '../../lib/personalBests'
import { ConsistencyHeatmap } from './ConsistencyHeatmap'
import { DayTypeCounts } from './DayTypeCounts'
import { PersonalBests } from './PersonalBests'

// Consistency heatmap is the hero visual; day-type counts are the "what kind
// of training" breakdown; personal bests are the max-holder layer below it.
export function StatsPage() {
  const { session } = useAuth()
  const { data: completedWorkouts } = useWorkoutHistory(session!.user.id)
  const workouts = useMemo(() => completedWorkouts ?? [], [completedWorkouts])

  const dayTypeCounts = useMemo(() => getDayTypeCounts(workouts), [workouts])
  const trackedBests = useMemo(() => getTrackedBests(workouts), [workouts])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-text">Stats</h1>

      <section className="rounded-2xl border border-border bg-surface p-4">
        {workouts.length === 0 ? (
          <p className="text-sm text-text-muted">
            Your consistency heatmap will fill in as you log workouts.
          </p>
        ) : (
          <ConsistencyHeatmap workouts={workouts} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-text-faint">Training split</p>
        <DayTypeCounts counts={dayTypeCounts} />
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-text-faint">Personal bests</p>
        <PersonalBests bests={trackedBests} />
      </section>
    </div>
  )
}
