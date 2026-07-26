import { useState } from 'react'
import { Stepper } from '../../components/ui/Stepper'
import type { WorkoutExercise } from '../../types/domain'

interface SetLoggerProps {
  workoutExercise: WorkoutExercise
  setNumber: number
  onLogSet: (weight: number, reps: number) => void
}

// Pre-filled quick-adjust logging (Phase 3): defaults to last performance,
// nudged with steppers — no keyboard needed mid-workout.
export function SetLogger({ workoutExercise, setNumber, onLogSet }: SetLoggerProps) {
  const { exercise, lastPerformance } = workoutExercise
  const [weight, setWeight] = useState(lastPerformance?.weight ?? 0)
  const [reps, setReps] = useState(lastPerformance?.reps ?? 10)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="mb-2 text-xs text-[var(--color-text-faint)]">Set {setNumber}</p>
      <div className="flex gap-2">
        {!exercise.isBodyweight && (
          <Stepper label="Weight" value={weight} step={2.5} unit="kg" onChange={setWeight} />
        )}
        <Stepper label="Reps" value={reps} step={1} onChange={setReps} min={1} />
      </div>
      <button
        type="button"
        onClick={() => onLogSet(exercise.isBodyweight ? 0 : weight, reps)}
        className="mt-3 w-full rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.99]"
      >
        Log Set
      </button>
    </div>
  )
}
