import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePlayerStats } from '../../hooks/usePlayerStats'
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory'
import { useProfile } from '../../hooks/useProfile'
import { getLevelProgress, getRankTitle } from '../../lib/gamification'
import { getFocusRecommendation, DAY_TYPE_LABELS } from '../../lib/recommendation'
import { getSessionQuestsForDayType } from '../../lib/quests'
import { getWeeklyGoalProgress } from '../../lib/goals'
import { GoalsCard } from './GoalsCard'
import { FriendsCard } from './FriendsCard'
import { CoachCard } from './CoachCard'
import { InstallPrompt } from '../../components/ui/InstallPrompt'

// Hero: today's workout CTA (recommendation-led when there is one). Status
// strip: level/XP, streak — glanceable, not competing for attention.
export function HomePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session!.user.id
  const { data: stats } = usePlayerStats(userId)
  const { data: history } = useWorkoutHistory(userId)
  const { data: profile } = useProfile(userId)
  const recommendation = getFocusRecommendation(history ?? [])

  const totalXp = stats?.total_xp ?? 0
  const streakWeeks = stats?.streak_weeks ?? 0
  const shieldCount = stats?.shield_count ?? 0
  const { level, xpIntoLevel, xpForNextLevel } = getLevelProgress(totalXp)
  const rankTitle = getRankTitle(level)
  const progressPct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
  const goalProgress = getWeeklyGoalProgress(history ?? [], profile?.weekly_goal ?? 3)

  return (
    <div className="flex flex-col gap-6">
      <InstallPrompt />
      <header className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-xs text-text-faint">
            Level {level} · {rankTitle}
          </p>
          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-text-faint">
            {xpIntoLevel} / {xpForNextLevel} XP
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
          {shieldCount > 0 && (
            <div>
              <p className="text-xs text-text-faint">Shields</p>
              <p className="text-sm font-semibold text-accent">{shieldCount}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-faint">Streak</p>
            <p className="text-xl font-bold text-celebration">
              {streakWeeks}
              <span className="text-xs font-medium text-text-faint"> wk</span>
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-surface p-6">
        {recommendation ? (
          <>
            <p className="text-sm text-text-muted">Next up</p>
            <h1 className="mt-1 text-2xl font-semibold text-text">
              {DAY_TYPE_LABELS[recommendation.dayType]}
            </h1>
            <p className="mt-2 text-sm text-text-muted">{recommendation.message}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-muted">Ready to train?</p>
            <h1 className="mt-1 text-2xl font-semibold text-text">Log today&apos;s workout</h1>
          </>
        )}
        <button
          type="button"
          onClick={() => navigate('/train')}
          className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Start Workout
        </button>
      </section>

      <CoachCard userId={userId} />

      <GoalsCard progress={goalProgress} />

      <FriendsCard userId={userId} />

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-medium text-text-faint">Today&apos;s quests</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {getSessionQuestsForDayType(recommendation?.dayType ?? null).map((quest) => (
            <li key={quest.id} className="text-sm text-text-muted">
              • {quest.title}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-text-faint">Start your workout to begin tracking these.</p>
      </section>
    </div>
  )
}
