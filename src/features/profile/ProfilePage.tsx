import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePlayerStats } from '../../hooks/usePlayerStats'
import { useProfile, useUpdateProfile } from '../../hooks/useProfile'
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory'
import { useAchievements } from '../../hooks/useAchievements'
import { useXpEvents } from '../../hooks/useXpEvents'
import { getLevelProgress, getRankTitle } from '../../lib/gamification'
import { ACHIEVEMENT_DEFINITIONS, computeStats } from '../../../shared/achievements'
import { AchievementCard } from './AchievementCard'
import { RecentActivity } from './RecentActivity'
import { Stepper } from '../../components/ui/Stepper'
import { supabase } from '../../lib/supabase'

export function ProfilePage() {
  const { session } = useAuth()
  const userId = session!.user.id

  const { data: stats } = usePlayerStats(userId)
  const { data: profile } = useProfile(userId)
  const { data: completedWorkouts } = useWorkoutHistory(userId)
  const { data: unlockedAchievements } = useAchievements(userId)
  const { data: xpEvents } = useXpEvents(userId)
  const updateProfile = useUpdateProfile(userId)
  const [displayNameInput, setDisplayNameInput] = useState('')

  useEffect(() => {
    if (profile) setDisplayNameInput(profile.display_name ?? '')
  }, [profile])

  const totalXp = stats?.total_xp ?? 0
  const streakWeeks = stats?.streak_weeks ?? 0
  const shieldCount = stats?.shield_count ?? 0
  const weeklyGoal = profile?.weekly_goal ?? 3
  const experienceLevel = profile?.experience_level ?? null

  const { level } = getLevelProgress(totalXp)
  const rankTitle = getRankTitle(level)
  const achievementStats = useMemo(() => computeStats(completedWorkouts ?? []), [completedWorkouts])
  const unlockedAtByAchievement = useMemo(
    () => new Map((unlockedAchievements ?? []).map((row) => [row.achievement_id, row.unlocked_at])),
    [unlockedAchievements],
  )

  function handleWeeklyGoalChange(nextGoal: number) {
    if (!profile) return
    updateProfile.mutate({ experience_level: profile.experience_level, weekly_goal: nextGoal })
  }

  function handleSaveDisplayName() {
    if (!profile) return
    const trimmed = displayNameInput.trim()
    updateProfile.mutate({
      experience_level: profile.experience_level,
      weekly_goal: profile.weekly_goal,
      display_name: trimmed.length > 0 ? trimmed : null,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs text-text-faint">Level {level}</p>
        <h1 className="mt-0.5 text-xl font-semibold text-celebration">{rankTitle}</h1>
        <p className="mt-1 text-xs text-text-muted">{streakWeeks} week streak</p>
      </header>

      <section className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-medium text-text">Streak shields</p>
          <p className="text-xs text-text-faint">Protects a missed weekly goal automatically</p>
        </div>
        <span className="text-2xl font-bold text-accent">{shieldCount}</span>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-text-faint">Achievements</p>
        {ACHIEVEMENT_DEFINITIONS.map((definition) => (
          <AchievementCard
            key={definition.id}
            definition={definition}
            stats={achievementStats}
            unlockedAt={unlockedAtByAchievement.get(definition.id)}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-medium text-text-faint">Recent activity</p>
        <RecentActivity events={xpEvents ?? []} />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-medium text-text-faint">Settings</p>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-muted">Display name</span>
          <p className="text-xs text-text-faint">Shown to friends instead of your email.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              maxLength={40}
              placeholder="Add a name"
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint"
            />
            <button
              type="button"
              onClick={handleSaveDisplayName}
              disabled={displayNameInput.trim() === (profile?.display_name ?? '')}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Experience level</span>
          <span className="text-text">
            {experienceLevel === 'new' ? 'New to the gym' : 'Been before'}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-muted">Weekly goal</span>
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
          className="self-start rounded-lg border border-border px-3 py-2 text-xs text-text-faint"
        >
          Sign out
        </button>
      </section>
    </div>
  )
}
