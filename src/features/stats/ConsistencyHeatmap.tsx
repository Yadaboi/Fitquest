import { useMemo, useState } from 'react'
import type { HistoryWorkout } from '../../hooks/useWorkoutHistory'

const WEEKS = 10
const DAYS = WEEKS * 7
const HEAT_STEPS = [
  'var(--color-heat-0)',
  'var(--color-heat-1)',
  'var(--color-heat-2)',
  'var(--color-heat-3)',
  'var(--color-heat-4)',
]

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function levelForCount(count: number) {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 8) return 3
  return 4
}

interface DayCell {
  key: string
  date: Date
  count: number
  level: number
}

// Sequential (one hue) magnitude encoding, per dataviz skill: heatmap for a
// grid, more-is-brighter in dark mode. Hover AND focus both surface the same
// info line — no value is hover-only.
export function ConsistencyHeatmap({ workouts }: { workouts: HistoryWorkout[] }) {
  const [activeCell, setActiveCell] = useState<DayCell | null>(null)

  const weeks = useMemo(() => {
    const countByDate = new Map<string, number>()
    for (const workout of workouts) {
      countByDate.set(workout.date, (countByDate.get(workout.date) ?? 0) + workout.sets.length)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - today.getDay() - (WEEKS - 1) * 7)

    const days: DayCell[] = []
    for (let i = 0; i < DAYS; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const key = toDateKey(date)
      const count = countByDate.get(key) ?? 0
      days.push({ key, date, count, level: levelForCount(count) })
    }

    const rows: DayCell[][] = []
    for (let i = 0; i < WEEKS; i++) {
      rows.push(days.slice(i * 7, i * 7 + 7))
    }
    return rows
  }, [workouts])

  const totalActiveDays = weeks.flat().filter((d) => d.count > 0).length

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium text-text-faint">Last 10 weeks</p>
        <p className="text-xs text-text-faint">{totalActiveDays} active days</p>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {weeks.map((row) => (
          <div key={row[0].key} className="flex gap-1">
            {row.map((day) => {
              const isFuture = day.date > new Date()
              return (
                <button
                  key={day.key}
                  type="button"
                  disabled={isFuture}
                  aria-label={`${day.date.toDateString()}: ${day.count} sets`}
                  onMouseEnter={() => setActiveCell(day)}
                  onFocus={() => setActiveCell(day)}
                  onMouseLeave={() => setActiveCell(null)}
                  onBlur={() => setActiveCell(null)}
                  onClick={() => setActiveCell(day)}
                  className="h-4 flex-1 rounded-sm outline-offset-2 disabled:opacity-0"
                  style={{ background: HEAT_STEPS[day.level] }}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="min-h-[1rem] text-xs text-text-muted">
          {activeCell
            ? `${activeCell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — ${activeCell.count} sets`
            : 'Hover or tap a day for details'}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-faint">Less</span>
          {HEAT_STEPS.map((color) => (
            <span key={color} className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          ))}
          <span className="text-xs text-text-faint">More</span>
        </div>
      </div>
    </div>
  )
}
