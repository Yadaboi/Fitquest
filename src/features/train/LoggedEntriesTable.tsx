import type { LoggedEntry } from '../../types/domain'

// Running list of everything logged this session — replaces the old
// per-fixed-exercise card grid now that exercises are free-form.
export function LoggedEntriesTable({ entries }: { entries: LoggedEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Nothing logged yet — use the form above to add your first entry.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={
            'flex items-center justify-between rounded-lg border px-3 py-2 text-sm ' +
            (entry.isPr ? 'border-celebration text-celebration' : 'border-border text-text-muted')
          }
        >
          <span className="font-medium text-text">{entry.exerciseName}</span>
          <span className="tabular-nums">
            {entry.entryType === 'strength'
              ? entry.weight > 0
                ? `${entry.weight}kg × ${entry.reps}`
                : `${entry.reps} reps`
              : `${entry.durationMinutes} min`}
            {entry.isPr ? ' • PR' : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}
