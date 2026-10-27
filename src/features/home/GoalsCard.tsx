import type { WeeklyGoalProgress } from '../../lib/goals'

export function GoalsCard({ progress }: { progress: WeeklyGoalProgress }) {
  const pct =
    progress.goal > 0 ? Math.min(100, Math.round((progress.completed / progress.goal) * 100)) : 0
  const metGoal = progress.completed >= progress.goal

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-faint">Weekly goal</p>
        <p className="text-xs text-text-muted">
          {progress.completed}/{progress.goal} workouts
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={
            'h-full rounded-full transition-all ' + (metGoal ? 'bg-celebration' : 'bg-accent')
          }
          style={{ width: `${pct}%` }}
        />
      </div>
      {metGoal && (
        <p className="mt-2 text-xs text-celebration">
          Goal met for this week — anything else is a bonus.
        </p>
      )}
    </section>
  )
}
