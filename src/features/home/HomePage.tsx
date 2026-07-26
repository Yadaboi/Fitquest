import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePlayerStats } from '../../hooks/usePlayerStats'
import { getLevelProgress } from '../../lib/gamification'

// Hero: today's workout CTA. Status strip: level/XP, streak — glanceable, not competing for attention.
export function HomePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { data: stats } = usePlayerStats(session!.user.id)

  const totalXp = stats?.total_xp ?? 0
  const streakWeeks = stats?.streak_weeks ?? 0
  const { level, xpIntoLevel, xpForNextLevel } = getLevelProgress(totalXp)
  const progressPct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div>
          <p className="text-xs text-[var(--color-text-faint)]">Level {level}</p>
          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-faint)]">Streak</p>
          <p className="text-sm font-semibold text-[var(--color-celebration)]">
            {streakWeeks} wk
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-sm text-[var(--color-text-muted)]">Today&apos;s workout</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
          Full Body — Day 1
        </h1>
        <button
          type="button"
          onClick={() => navigate('/train')}
          className="mt-5 w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Start Workout
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Session quests</p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Quests will appear here once your workout starts.
        </p>
      </section>
    </div>
  )
}
