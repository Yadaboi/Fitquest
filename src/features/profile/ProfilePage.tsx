import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePlayerStats } from '../../hooks/usePlayerStats'
import { useProfile, useUpdateProfile } from '../../hooks/useProfile'
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory'
import { getLevelProgress, getRankTitle } from '../../lib/gamification'
import { ACHIEVEMENT_DEFINITIONS, computeStats } from '../../lib/achievements'
import { AchievementCard } from './AchievementCard'
import { Stepper } from '../../components/ui/Stepper'
import { supabase } from '../../lib/supabase'

export function ProfilePage() {
  const { session } = useAuth()
  const userId = session!.user.id

  const { data: stats } = usePlayerStats(userId)
  const { data: profile } = useProfile(userId)
  const { data: completedWorkouts } = useWorkoutHistory(userId)
  const updateProfile = useUpdateProfile(userId)

  const totalXp = stats?.total_xp ?? 0
  const streakWeeks = stats?.streak_weeks ?? 0
  const shieldCount = stats?.shield_count ?? 0
  const weeklyGoal = profile?.weekly_goal ?? 3
  const experienceLevel = profile?.experience_level ?? null

  const { level } = getLevelProgress(totalXp)
  const rankTitle = getRankTitle(level)
  const achievementStats = useMemo(
    () => computeStats(completedWorkouts ?? []),
    [completedWorkouts],
  )

  function handleWeeklyGoalChange(nextGoal: number) {
    if (!profile) return
    updateProfile.mutate({ experience_level: profile.experience_level, weekly_goal: nextGoal })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs text-[var(--color-text-faint)]">Level {level}</p>
        <h1 className="mt-0.5 text-xl font-semibold text-[var(--color-celebration)]">
          {rankTitle}
        </h1>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{streakWeeks} week streak</p>
      </header>

      <section className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Streak shields</p>
          <p className="text-xs text-[var(--color-text-faint)]">
            Protects a missed weekly goal automatically
          </p>
        </div>
        <span className="text-2xl font-bold text-[var(--color-accent)]">{shieldCount}</span>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Achievements</p>
        {ACHIEVEMENT_DEFINITIONS.map((definition) => (
          <AchievementCard key={definition.id} definition={definition} stats={achievementStats} />
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs font-medium text-[var(--color-text-faint)]">Settings</p>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">Experience level</span>
          <span className="text-[var(--color-text)]">
            {experienceLevel === 'new' ? 'New to the gym' : 'Been before'}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Weekly goal</span>
          <Stepper
            label="Weekly goal"
            value={weeklyGoal}
            step={1}
            min={1}
            unit="workouts"
            onChange={handleWeeklyGoalChange}
          />
        </div>

        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="self-start rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-faint)]"
        >
          Sign out
        </button>
      </section>
    </div>
  )
}
