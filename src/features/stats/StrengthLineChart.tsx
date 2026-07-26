import { useRef, useState } from 'react'

export interface ValuePoint {
  date: string
  value: number
}

const WIDTH = 300
const HEIGHT = 120
const PAD = { top: 16, right: 12, bottom: 20, left: 30 }

function scaleX(i: number, count: number) {
  if (count <= 1) return PAD.left
  return PAD.left + (i / (count - 1)) * (WIDTH - PAD.left - PAD.right)
}

function scaleY(value: number, min: number, max: number) {
  const range = max - min || 1
  return HEIGHT - PAD.bottom - ((value - min) / range) * (HEIGHT - PAD.top - PAD.bottom)
}

// Single-series line (Phase 3 drill-down layer): one hue, no legend box —
// the title names the series. Crosshair + tooltip on hover AND keyboard focus.
export function StrengthLineChart({
  exerciseName,
  unit,
  points,
}: {
  exerciseName: string
  unit: string
  points: ValuePoint[]
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm font-medium text-[var(--color-text)]">{exerciseName}</p>
        <p className="mt-2 text-xs text-[var(--color-text-faint)]">
          Log a couple more sessions to see your strength trend here.
        </p>
      </div>
    )
  }

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i, points.length)} ${scaleY(p.value, min, max)}`)
    .join(' ')

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    const svgX = fraction * WIDTH
    const rawIndex = ((svgX - PAD.left) / (WIDTH - PAD.left - PAD.right)) * (points.length - 1)
    const clamped = Math.max(0, Math.min(points.length - 1, Math.round(rawIndex)))
    setActiveIndex(clamped)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      setActiveIndex((prev) => Math.min(points.length - 1, (prev ?? -1) + 1))
    } else if (e.key === 'ArrowLeft') {
      setActiveIndex((prev) => Math.max(0, (prev ?? points.length) - 1))
    }
  }

  const active = activeIndex !== null ? points[activeIndex] : points[points.length - 1]
  const activeX = scaleX(activeIndex ?? points.length - 1, points.length)
  const activeY = scaleY(active.value, min, max)

  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      tabIndex={0}
      role="img"
      aria-label={`${exerciseName} over time, current ${active.value}${unit}`}
      onKeyDown={handleKeyDown}
      onBlur={() => setActiveIndex(null)}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-[var(--color-text)]">{exerciseName}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {active.value}
          {unit}
          <span className="text-[var(--color-text-faint)]">
            {' '}
            · {new Date(active.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </p>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        preserveAspectRatio="none"
      >
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={scaleY(max, min, max)}
          y2={scaleY(max, min, max)}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={scaleY(min, min, max)}
          y2={scaleY(min, min, max)}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <text x={2} y={scaleY(max, min, max) + 3} className="fill-[var(--color-text-faint)]" fontSize={9}>
          {Math.round(max)}
        </text>
        <text x={2} y={scaleY(min, min, max) + 3} className="fill-[var(--color-text-faint)]" fontSize={9}>
          {Math.round(min)}
        </text>

        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {activeIndex !== null && (
          <line
            x1={activeX}
            x2={activeX}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        )}

        <circle
          cx={activeX}
          cy={activeY}
          r={4}
          fill="var(--color-accent)"
          stroke="var(--color-surface)"
          strokeWidth={2}
        />

        <rect
          x={PAD.left}
          y={0}
          width={WIDTH - PAD.left - PAD.right}
          height={HEIGHT}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
        />
      </svg>
    </div>
  )
}
