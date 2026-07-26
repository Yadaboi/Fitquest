import type { XpEventRow } from '../../types/supabase'

const SOURCE_LABELS: Record<XpEventRow['source'], string> = {
  set: 'Set logged',
  completion: 'Workout complete',
  pr: 'Personal record',
  quest: 'Quest complete',
}

export function RecentActivity({ events }: { events: XpEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Finish a workout to start seeing your XP history here.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-center justify-between text-sm text-[var(--color-text-muted)]"
        >
          <span>{SOURCE_LABELS[event.source]}</span>
          <span className="font-medium text-[var(--color-accent)]">+{event.amount} XP</span>
        </li>
      ))}
    </ul>
  )
}
