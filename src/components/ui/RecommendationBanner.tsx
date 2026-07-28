import type { FocusRecommendation } from '../../lib/recommendation'

// Renders nothing when there's no recommendation (no history yet, or
// nothing overdue) — the caller doesn't need to branch on that itself.
export function RecommendationBanner({
  recommendation,
}: {
  recommendation: FocusRecommendation | null
}) {
  if (!recommendation) return null

  return (
    <section className="rounded-2xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-4">
      <p className="text-xs font-medium text-[var(--color-accent)]">Today&apos;s recommendation</p>
      <p className="mt-1 text-sm text-[var(--color-text)]">{recommendation.message}</p>
    </section>
  )
}
