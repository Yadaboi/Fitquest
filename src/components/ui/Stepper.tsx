interface StepperProps {
  label: string
  value: number
  step: number
  unit?: string
  onChange: (value: number) => void
  min?: number
}

export function Stepper({ label, value, step, unit, onChange, min = 0 }: StepperProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3">
      <span className="text-xs font-medium text-[var(--color-text-faint)]">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-lg text-[var(--color-text)] active:scale-95"
        >
          −
        </button>
        <span className="min-w-[3.5rem] text-center text-lg font-semibold tabular-nums text-[var(--color-text)]">
          {value}
          {unit ? <span className="text-xs text-[var(--color-text-faint)]"> {unit}</span> : null}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + step)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-lg text-[var(--color-text)] active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  )
}
