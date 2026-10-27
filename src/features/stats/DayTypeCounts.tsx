import { DAY_TYPES, DAY_TYPE_LABELS } from '../../lib/recommendation'
import type { DayType } from '../../types/domain'

export function DayTypeCounts({ counts }: { counts: Record<DayType, number> }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DAY_TYPES.map((dayType) => (
        <div
          key={dayType}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-center"
        >
          <p className="text-lg font-semibold tabular-nums text-text">{counts[dayType]}</p>
          <p className="text-xs text-text-faint">{DAY_TYPE_LABELS[dayType]}</p>
        </div>
      ))}
    </div>
  )
}
