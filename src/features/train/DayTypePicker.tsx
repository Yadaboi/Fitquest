import { DAY_TYPES, DAY_TYPE_LABELS } from '../../lib/recommendation'
import type { DayType } from '../../types/domain'

// Six options, not a narrower upper/lower or push/pull/legs split — the user
// picks whichever framework fits that day. Locks once the workout row
// exists (a session can't mix day types).
export function DayTypePicker({
  value,
  onChange,
  recommended,
  locked,
}: {
  value: DayType | null
  onChange: (dayType: DayType) => void
  recommended: DayType | null
  locked: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DAY_TYPES.map((dayType) => {
        const isSelected = value === dayType
        return (
          <button
            key={dayType}
            type="button"
            disabled={locked}
            onClick={() => onChange(dayType)}
            className={
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-default ' +
              (isSelected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] disabled:opacity-50')
            }
          >
            {DAY_TYPE_LABELS[dayType]}
            {recommended === dayType && (
              <span className="rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                Recommended
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
