import { useState } from 'react'
import { Stepper } from '../../components/ui/Stepper'

const DATALIST_ID = 'cardio-activity-suggestions'

// Cardio has no weight/reps — just an activity name and a duration.
export function CardioEntryForm({
  suggestions,
  onLogCardio,
}: {
  suggestions: string[]
  onLogCardio: (activityName: string, durationMinutes: number) => void
}) {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(20)

  function handleLog() {
    const trimmed = name.trim()
    if (!trimmed || duration <= 0) return
    onLogCardio(trimmed, duration)
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="mb-2 text-xs text-[var(--color-text-faint)]">Log cardio</p>
      <input
        type="text"
        list={DATALIST_ID}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Activity (e.g. Running)"
        className="mb-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]"
      />
      <datalist id={DATALIST_ID}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {/* 1-minute steps, not 5 — coarser increments made it impossible to
          show meaningful progress on a timed entry like "Mile Run". */}
      <Stepper label="Duration" value={duration} step={1} unit="min" onChange={setDuration} min={1} />
      <button
        type="button"
        onClick={handleLog}
        disabled={!name.trim()}
        className="mt-3 w-full rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.99] disabled:opacity-40"
      >
        Log Cardio
      </button>
    </div>
  )
}
