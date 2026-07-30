import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePlayerStats } from '../../hooks/usePlayerStats'
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory'
import { getLevelProgress, getRankTitle } from '../../lib/gamification'
import { getFocusRecommendation } from '../../lib/recommendation'
import { getSessionQuestsForDayType } from '../../lib/quests'
import { RecommendationBanner } from '../../components/ui/RecommendationBanner'

// Hero: today's workout CTA. Status strip: level/XP, streak — glanceable, not competing for attention.
export function HomePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session!.user.id
  const { data: stats } = usePlayerStats(userId)
  const { data: history } = useWorkoutHistory(userId)
  const recommendation = getFocusRecommendation(history ?? [])

  const totalXp = stats?.total_xp ?? 0
  const streakWeeks = stats?.streak_weeks ?? 0
  const shieldCount = stats?.shield_count ?? 0
  const { level, xpIntoLevel, xpForNextLevel } = getLevelProgress(totalXp)
  const rankTitle = getRankTitle(level)
  const progressPct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div>
          <p className="text-xs text-[var(--color-text-faint)]">
            Level {level} · {rankTitle}
          </p>
          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          {shieldCount > 0 && (
            <div>
              <p className="text-xs text-[var(--color-text-faint)]">Shields</p>
              <p className="text-sm font-semibold text-[var(--color-accent)]">{shieldCount}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[var(--color-text-faint)]">Streak</p>
            <p className="text-sm font-semibold text-[var(--color-celebration)]">
              {streakWeeks} wk
            </p>
          </div>
        </div>
      </header>

      <RecommendationBanner recommendation={recommendation} />

      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-sm text-[var(--color-text-muted)]">Ready to train?</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text)]">Log today&apos;s workout</h1>
        <button
          type="button"
          onClick={() => navigate('/train')}
          className="mt-5 w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Start Workout
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Today&apos;s quests</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {getSessionQuestsForDayType(recommendation?.dayType ?? null).map((quest) => (
            <li key={quest.id} className="text-sm text-[var(--color-text-muted)]">
              • {quest.title}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[var(--color-text-faint)]">
          Start your workout to begin tracking these.
        </p>
      </section>
    </div>
  )
}
