import { useState } from 'react'
import { Stepper } from '../../components/ui/Stepper'
import { useAuth } from '../../context/AuthContext'
import { useUpdateProfile } from '../../hooks/useProfile'
import type { ExperienceLevel } from '../../types/supabase'

// Minimal setup, learn-by-doing (Phase 3): only what's essential to suggest
// a first workout. No walkthrough — mechanics get explained contextually
// the first time they actually show up.
export function OnboardingPage() {
  const { session } = useAuth()
  const updateProfile = useUpdateProfile(session?.user.id)
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null)
  const [weeklyGoal, setWeeklyGoal] = useState(3)

  function handleStart() {
    if (!experienceLevel) return
    // No manual navigation: once this succeeds, the profile query invalidates
    // and refetches, and App's routing re-evaluates hasOnboarded reactively.
    updateProfile.mutate({ experience_level: experienceLevel, weekly_goal: weeklyGoal })
  }

  return (
    <div className="animate-fade-in-up flex min-h-svh flex-col justify-center gap-8 px-6 py-10">
      <div>
        <p className="text-sm font-medium text-accent">Welcome to FitQuest</p>
        <h1 className="mt-1 text-2xl font-semibold text-text">Every set you log levels you up.</h1>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-text-muted">Where are you starting from?</p>
        <div className="flex gap-3">
          {(
            [
              { value: 'new', label: 'New to the gym' },
              { value: 'returning', label: 'Been before' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setExperienceLevel(option.value)}
              className={
                'flex-1 rounded-xl border px-3 py-4 text-sm font-medium transition-colors ' +
                (experienceLevel === option.value
                  ? 'border-accent bg-accent/10 text-text'
                  : 'border-border bg-surface text-text-muted')
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-text-muted">
          How many workouts a week are you aiming for?
        </p>
        <Stepper
          label="Weekly goal"
          value={weeklyGoal}
          step={1}
          min={1}
          unit="workouts"
          onChange={setWeeklyGoal}
        />
      </div>

      {updateProfile.isError && (
        <p className="text-sm text-danger">Something went wrong saving that — try again.</p>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={!experienceLevel || updateProfile.isPending}
        className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-40"
      >
        {updateProfile.isPending ? 'Saving...' : "Let's go"}
      </button>
    </div>
  )
}
