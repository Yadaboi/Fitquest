import { SetLogger } from './SetLogger'
import type { LoggedSet, WorkoutExercise } from '../../types/domain'

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise
  loggedSets: LoggedSet[]
  onLogSet: (weight: number, reps: number) => void
}

export function ExerciseCard({ workoutExercise, loggedSets, onLogSet }: ExerciseCardProps) {
  const { exercise, targetSets, lastPerformance } = workoutExercise
  const isTargetMet = loggedSets.length >= targetSets

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)]">{exercise.name}</h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{exercise.cue}</p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text-faint)]">
          {loggedSets.length}/{targetSets} sets
        </span>
      </div>

      {loggedSets.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {loggedSets.map((set) => (
            <li
              key={set.id}
              className={
                'rounded-lg border px-2 py-1 text-xs ' +
                (set.isPr
                  ? 'border-[var(--color-celebration)] text-[var(--color-celebration)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)]')
              }
            >
              {exercise.isBodyweight ? `${set.reps} reps` : `${set.weight}kg × ${set.reps}`}
              {set.isPr ? ' • PR' : ''}
            </li>
          ))}
        </ul>
      )}

      <SetLogger
        workoutExercise={{ exercise, targetSets, lastPerformance }}
        setNumber={loggedSets.length + 1}
        onLogSet={onLogSet}
      />

      {isTargetMet && (
        <p className="text-center text-xs text-[var(--color-text-faint)]">
          Target hit — keep going or move on.
        </p>
      )}
    </section>
  )
}
