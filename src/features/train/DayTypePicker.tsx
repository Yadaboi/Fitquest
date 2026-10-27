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
    <div className="flex flex-col gap-1.5">
      <label htmlFor="day-type-select" className="text-xs font-medium text-text-faint">
        Today&apos;s focus
      </label>
      <select
        id="day-type-select"
        value={value ?? ''}
        disabled={locked}
        onChange={(e) => onChange(e.target.value as DayType)}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium text-text disabled:opacity-50"
      >
        <option value="" disabled>
          Choose a day type
        </option>
        {DAY_TYPES.map((dayType) => (
          <option key={dayType} value={dayType}>
            {DAY_TYPE_LABELS[dayType]}
            {recommended === dayType ? ' (Recommended)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
