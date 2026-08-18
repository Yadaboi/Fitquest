import { DAY_TYPES, DAY_TYPE_LABELS } from '../../lib/recommendation'
import type { DayType } from '../../types/domain'

// Seven options, not a narrower upper/lower or push/pull/legs split — the
// user picks whichever framework fits that day, including "custom" for a
// session that mixes muscle groups (e.g. shoulders + legs). Locks once the
// workout row exists (a session can't mix day types, or change its label).
export function DayTypePicker({
  value,
  onChange,
  customLabel,
  onCustomLabelChange,
  recommended,
  locked,
}: {
  value: DayType | null
  onChange: (dayType: DayType) => void
  customLabel: string
  onCustomLabelChange: (label: string) => void
  recommended: DayType | null
  locked: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="day-type-select" className="text-xs font-medium text-[var(--color-text-faint)]">
        Today&apos;s focus
      </label>
      <select
        id="day-type-select"
        value={value ?? ''}
        disabled={locked}
        onChange={(e) => onChange(e.target.value as DayType)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm font-medium text-[var(--color-text)] disabled:opacity-50"
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

      {value === 'custom' && (
        <input
          type="text"
          value={customLabel}
          disabled={locked}
          onChange={(e) => onCustomLabelChange(e.target.value)}
          placeholder="e.g. Shoulders & Legs"
          maxLength={60}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] disabled:opacity-50"
        />
      )}
    </div>
  )
}
