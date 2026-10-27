import { formatMileTime, type LiftBest, type TrackedBests } from '../../lib/personalBests'

function LiftCard({ label, best }: { label: string; best: LiftBest | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-text">{label}</p>
      {best ? (
        <p className="mt-1 text-lg font-semibold tabular-nums text-accent">
          {best.weight}kg <span className="text-sm font-normal text-text-muted">× {best.reps}</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-text-faint">Not logged yet</p>
      )}
    </div>
  )
}

// Max holders for the four lifts the app always tracks. Log a set/entry
// named exactly "Bench", "Squat", "Deadlift", or "Mile Run" for it to
// count here — everything else you log still shows up in Recent Activity
// and the consistency heatmap, just not this panel.
export function PersonalBests({ bests }: { bests: TrackedBests }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <LiftCard label="Bench" best={bests.bench} />
      <LiftCard label="Squat" best={bests.squat} />
      <LiftCard label="Deadlift" best={bests.deadlift} />
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-text">Mile Run</p>
        {bests.mileRunMinutes !== null ? (
          <p className="mt-1 text-lg font-semibold tabular-nums text-accent">
            {formatMileTime(bests.mileRunMinutes)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-text-faint">Not logged yet</p>
        )}
      </div>
    </div>
  )
}
