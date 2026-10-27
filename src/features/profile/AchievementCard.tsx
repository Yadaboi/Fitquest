import {
  TIER_NAMES,
  getAchievementProgress,
  type AchievementDefinition,
  type AchievementStats,
} from '../../../shared/achievements'

export function AchievementCard({
  definition,
  stats,
  unlockedAt,
}: {
  definition: AchievementDefinition
  stats: AchievementStats
  unlockedAt?: string
}) {
  const { tierIndex, value, nextThreshold } = getAchievementProgress(definition, stats)
  const currentTierName = tierIndex >= 0 ? TIER_NAMES[tierIndex] : null
  const floor = tierIndex >= 0 ? definition.thresholds[tierIndex] : 0
  const progressPct = nextThreshold
    ? Math.min(100, Math.round(((value - floor) / (nextThreshold - floor)) * 100))
    : 100

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text">{definition.title}</p>
          <p className="text-xs text-text-faint">{definition.description}</p>
        </div>
        <span
          className={
            'whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ' +
            (currentTierName
              ? 'bg-celebration/15 text-celebration'
              : 'bg-surface-2 text-text-faint')
          }
        >
          {currentTierName ?? 'Not started'}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-text-faint">
        {nextThreshold ? `${value} / ${nextThreshold} to next tier` : `${value} — maxed out`}
      </p>
      {unlockedAt && (
        <p className="mt-1 text-xs text-celebration">
          Unlocked {new Date(unlockedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
