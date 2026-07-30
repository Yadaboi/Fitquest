import { useState } from 'react'
import { Stepper } from '../../components/ui/Stepper'
import { normalizeExerciseName } from '../../../shared/exercise-name'

const DATALIST_ID = 'strength-exercise-suggestions'

// Free-text exercise name (with autocomplete over the user's own history,
// not a fixed catalog) + weight/reps steppers. Prefills from the last time
// this exact name was logged, same convenience the old fixed-catalog
// SetLogger gave for free.
export function StrengthEntryForm({
  suggestions,
  lastPerformanceByName,
  onLogSet,
}: {
  suggestions: string[]
  lastPerformanceByName: Record<string, { weight: number; reps: number }>
  onLogSet: (exerciseName: string, weight: number, reps: number) => void
}) {
  const [name, setName] = useState('')
  const [weight, setWeight] = useState(0)
  const [reps, setReps] = useState(10)

  function applyPrefill(typedName: string) {
    const last = lastPerformanceByName[normalizeExerciseName(typedName)]
    if (last) {
      setWeight(last.weight)
      setReps(last.reps)
    }
  }

  function handleLogSet() {
    const trimmed = name.trim()
    if (!trimmed || reps <= 0) return
    onLogSet(trimmed, weight, reps)
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="mb-2 text-xs text-[var(--color-text-faint)]">Log a set</p>
      <input
        type="text"
        list={DATALIST_ID}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={(e) => applyPrefill(e.target.value)}
        placeholder="Exercise name"
        className="mb-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]"
      />
      <datalist id={DATALIST_ID}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="flex gap-2">
        <Stepper label="Weight" value={weight} step={2.5} unit="kg" onChange={setWeight} />
        <Stepper label="Reps" value={reps} step={1} onChange={setReps} min={1} />
      </div>
      <button
        type="button"
        onClick={handleLogSet}
        disabled={!name.trim()}
        className="mt-3 w-full rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.99] disabled:opacity-40"
      >
        Log Set
      </button>
    </div>
  )
}
