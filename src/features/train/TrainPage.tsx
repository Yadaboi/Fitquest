import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { XP_PER_SET, PR_BONUS, QUEST_MIN_DISTINCT_EXERCISES, QUEST_MIN_CARDIO_MINUTES } from '../../../shared/gamification-constants'
import { ACHIEVEMENT_DEFINITIONS, TIER_NAMES } from '../../../shared/achievements'
import { normalizeExerciseName } from '../../../shared/exercise-name'
import {
  useWorkoutHistory,
  getLastPerformanceByExerciseName,
  getLastCardioByActivityName,
} from '../../hooks/useWorkoutHistory'
import { getFocusRecommendation, DAY_TYPE_LABELS } from '../../lib/recommendation'
import { getSessionQuestsForDayType } from '../../lib/quests'
import { DayTypePicker } from './DayTypePicker'
import { StrengthEntryForm } from './StrengthEntryForm'
import { CardioEntryForm } from './CardioEntryForm'
import { LoggedEntriesTable } from './LoggedEntriesTable'
import { XpTickStack, type XpTick } from '../../components/ui/XpTickStack'
import { Celebration, type CelebrationData } from '../../components/ui/Celebration'
import { RecommendationBanner } from '../../components/ui/RecommendationBanner'
import type { DayType, LoggedCardioEntry, LoggedEntry, LoggedStrengthEntry, SessionQuest } from '../../types/domain'

let tickIdCounter = 0

export function TrainPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const userId = session!.user.id

  const { data: history } = useWorkoutHistory(userId)
  const recommendation = useMemo(() => getFocusRecommendation(history ?? []), [history])
  const lastPerformanceByName = useMemo(
    () => getLastPerformanceByExerciseName(history ?? []),
    [history],
  )
  const lastCardioByName = useMemo(() => getLastCardioByActivityName(history ?? []), [history])

  const strengthSuggestions = useMemo(() => distinctNamesMostRecentFirst(history ?? [], 'strength'), [history])
  const cardioSuggestions = useMemo(() => distinctNamesMostRecentFirst(history ?? [], 'cardio'), [history])

  const [dayType, setDayType] = useState<DayType | null>(null)
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [entries, setEntries] = useState<LoggedEntry[]>([])
  const [ticks, setTicks] = useState<XpTick[]>([])
  // A finished workout can trigger several celebration-worthy moments at
  // once (completion, a shield, one or more achievement unlocks) — queued
  // so they're shown one at a time instead of only the last one winning.
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationData[]>([])
  const [navigateHomeAfterCelebrations, setNavigateHomeAfterCelebrations] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [quests, setQuests] = useState<SessionQuest[]>(() => getSessionQuestsForDayType(null))

  // Pre-select whatever's recommended, but only until the user (or workout
  // creation) locks it in — never override a manual choice.
  useEffect(() => {
    if (dayType === null && workoutId === null && recommendation) {
      setDayType(recommendation.dayType)
    }
  }, [recommendation, dayType, workoutId])

  // Quests depend on day type (cardio gets a duration quest instead of a
  // variety quest) — reset whenever the choice changes, up until it locks.
  useEffect(() => {
    if (!workoutId) {
      setQuests(getSessionQuestsForDayType(dayType))
    }
  }, [dayType, workoutId])

  function pushTick(amount: number) {
    const id = `tick-${tickIdCounter++}`
    setTicks((prev) => [...prev, { id, amount }])
    window.setTimeout(() => {
      setTicks((prev) => prev.filter((t) => t.id !== id))
    }, 700)
  }

  function queueCelebration(data: CelebrationData) {
    setCelebrationQueue((prev) => [...prev, data])
  }

  function updateQuestProgress(nextEntries: LoggedEntry[], hitPr: boolean) {
    const nextQuests = quests.map((quest) => {
      if (quest.isComplete) return quest
      if (quest.id === 'beat-best' && hitPr) return { ...quest, isComplete: true }
      if (quest.id === 'exercise-variety') {
        const distinct = new Set(
          nextEntries
            .filter((e): e is LoggedStrengthEntry => e.entryType === 'strength')
            .map((e) => normalizeExerciseName(e.exerciseName)),
        ).size
        if (distinct >= QUEST_MIN_DISTINCT_EXERCISES) return { ...quest, isComplete: true }
      }
      if (quest.id === 'cardio-minutes') {
        const totalMinutes = nextEntries
          .filter((e): e is LoggedCardioEntry => e.entryType === 'cardio')
          .reduce((sum, e) => sum + e.durationMinutes, 0)
        if (totalMinutes >= QUEST_MIN_CARDIO_MINUTES) return { ...quest, isComplete: true }
      }
      return quest
    })
    setQuests(nextQuests)
  }

  async function ensureWorkout(chosenDayType: DayType): Promise<string> {
    if (workoutId) return workoutId
    const { data, error } = await supabase
      .from('workouts')
      .insert({ user_id: userId, day_type: chosenDayType })
      .select('id')
      .single()
    if (error || !data) throw error ?? new Error('Failed to create workout')
    setWorkoutId(data.id)
    return data.id
  }

  async function handleLogSet(exerciseName: string, weight: number, reps: number) {
    if (!dayType) return
    setErrorMessage(null)
    const last = lastPerformanceByName[normalizeExerciseName(exerciseName)]
    // Optimistic guess for immediate feedback — the completeWorkout function
    // recomputes the authoritative is_pr value at the end.
    const isPr = weight > 0 && !!last && weight > last.weight

    try {
      const currentWorkoutId = await ensureWorkout(dayType)
      const { data, error } = await supabase
        .from('sets')
        .insert({
          workout_id: currentWorkoutId,
          exercise_name: exerciseName,
          entry_type: 'strength',
          weight,
          reps,
          is_pr: isPr,
        })
        .select('id')
        .single()
      if (error || !data) throw error ?? new Error('Failed to log set')

      const newEntry: LoggedStrengthEntry = {
        id: data.id,
        entryType: 'strength',
        exerciseName,
        weight,
        reps,
        isPr,
      }
      const nextEntries = [...entries, newEntry]
      setEntries(nextEntries)
      pushTick(XP_PER_SET)

      if (isPr) {
        queueCelebration({ title: 'New Personal Record', subtitle: exerciseName, amount: PR_BONUS })
      }

      updateQuestProgress(nextEntries, isPr)
    } catch (err) {
      setErrorMessage('Could not save that set — check your connection and try again.')
      console.error(err)
    }
  }

  async function handleLogCardio(activityName: string, durationMinutes: number) {
    if (!dayType) return
    setErrorMessage(null)
    const last = lastCardioByName[normalizeExerciseName(activityName)]
    const isPr = !!last && durationMinutes > last.durationMinutes

    try {
      const currentWorkoutId = await ensureWorkout(dayType)
      const { data, error } = await supabase
        .from('sets')
        .insert({
          workout_id: currentWorkoutId,
          exercise_name: activityName,
          entry_type: 'cardio',
          duration_minutes: durationMinutes,
          is_pr: isPr,
        })
        .select('id')
        .single()
      if (error || !data) throw error ?? new Error('Failed to log cardio')

      const newEntry: LoggedCardioEntry = {
        id: data.id,
        entryType: 'cardio',
        exerciseName: activityName,
        durationMinutes,
        isPr,
      }
      const nextEntries = [...entries, newEntry]
      setEntries(nextEntries)
      pushTick(XP_PER_SET)

      if (isPr) {
        queueCelebration({ title: 'New Personal Record', subtitle: activityName, amount: PR_BONUS })
      }

      updateQuestProgress(nextEntries, isPr)
    } catch (err) {
      setErrorMessage('Could not save that entry — check your connection and try again.')
      console.error(err)
    }
  }

  async function handleFinishWorkout() {
    if (!workoutId) return
    setIsFinishing(true)
    setErrorMessage(null)

    const { data, error } = await supabase.functions.invoke('complete-workout', {
      body: { workout_id: workoutId },
    })

    setIsFinishing(false)

    if (error || !data) {
      setErrorMessage('Could not finish the workout — try again in a moment.')
      console.error(error)
      return
    }

    queryClient.invalidateQueries({ queryKey: ['player-stats', userId] })
    queryClient.invalidateQueries({ queryKey: ['workout-history', userId] })
    queryClient.invalidateQueries({ queryKey: ['achievements', userId] })
    queryClient.invalidateQueries({ queryKey: ['xp-events', userId] })

    const newCelebrations: CelebrationData[] = [
      {
        title: 'Workout Complete',
        subtitle: `${entries.length} logged`,
        amount: data.xpAwarded,
      },
    ]

    if (data.shieldAwarded) {
      newCelebrations.push({
        title: 'Shield Earned',
        subtitle: 'Your streak is protected if you miss a week',
      })
    }

    const unlocked = (data.unlockedAchievements ?? []) as { id: string; tier: number }[]
    for (const unlock of unlocked) {
      const definition = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === unlock.id)
      if (!definition) continue
      newCelebrations.push({
        title: `${definition.title}: ${TIER_NAMES[unlock.tier]}`,
        subtitle: definition.description,
      })
    }

    setNavigateHomeAfterCelebrations(true)
    setCelebrationQueue(newCelebrations)

    // Fire-and-forget: the coach reacting to this workout is a nice-to-have,
    // never something "Finish Workout" should wait on or fail because of.
    if (dayType) {
      supabase.functions
        .invoke('coach-chat', {
          body: {
            trigger: 'post_workout',
            event: {
              dayType,
              setCount: entries.length,
              xpAwarded: data.xpAwarded,
              newTotalXp: data.newTotalXp,
              streakWeeks: data.streakWeeks,
              shieldAwarded: data.shieldAwarded,
              prCount: data.prCount,
              unlockedAchievements: unlocked,
              completedQuestTitles: quests.filter((q) => q.isComplete).map((q) => q.title),
            },
          },
        })
        .then(({ error: coachError }) => {
          if (!coachError) {
            queryClient.invalidateQueries({ queryKey: ['coach-messages', userId] })
            queryClient.invalidateQueries({ queryKey: ['coach-messages-latest', userId] })
          }
        })
        .catch(() => {})
    }
  }

  function handleDismissCelebration() {
    const remaining = celebrationQueue.slice(1)
    setCelebrationQueue(remaining)
    if (remaining.length === 0 && navigateHomeAfterCelebrations) navigate('/')
  }

  return (
    <div className="flex flex-col gap-4">
      <XpTickStack ticks={ticks} />
      <Celebration data={celebrationQueue[0] ?? null} onDismiss={handleDismissCelebration} />

      <header>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {dayType ? DAY_TYPE_LABELS[dayType] : 'Choose today’s focus'}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">{entries.length} logged</p>
      </header>

      {errorMessage && (
        <p className="rounded-lg border border-[var(--color-danger)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      )}

      <RecommendationBanner recommendation={recommendation} />

      <DayTypePicker
        value={dayType}
        onChange={setDayType}
        recommended={recommendation?.dayType ?? null}
        locked={workoutId !== null}
      />

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="mb-2 text-xs font-medium text-[var(--color-text-faint)]">Session quests</p>
        <ul className="flex flex-col gap-1.5">
          {quests.map((quest) => (
            <li
              key={quest.id}
              className={
                'text-sm ' +
                (quest.isComplete
                  ? 'text-[var(--color-celebration)] line-through'
                  : 'text-[var(--color-text-muted)]')
              }
            >
              {quest.isComplete ? '✓ ' : '• '}
              {quest.title}
            </li>
          ))}
        </ul>
      </section>

      {dayType === null && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Pick a day type above to start logging.
        </p>
      )}

      {dayType === 'cardio' && (
        <CardioEntryForm suggestions={cardioSuggestions} onLogCardio={handleLogCardio} />
      )}

      {dayType !== null && dayType !== 'cardio' && (
        <StrengthEntryForm
          suggestions={strengthSuggestions}
          lastPerformanceByName={lastPerformanceByName}
          onLogSet={handleLogSet}
        />
      )}

      <LoggedEntriesTable entries={entries} />

      <button
        type="button"
        onClick={handleFinishWorkout}
        disabled={entries.length === 0 || isFinishing}
        className="mt-2 w-full rounded-xl bg-[var(--color-celebration)] py-3 text-sm font-semibold text-[var(--color-celebration-foreground)] disabled:opacity-40"
      >
        {isFinishing ? 'Finishing...' : 'Finish Workout'}
      </button>
    </div>
  )
}

function distinctNamesMostRecentFirst(
  history: { date: string; sets: { entry_type: 'strength' | 'cardio'; exercise_name: string }[] }[],
  entryType: 'strength' | 'cardio',
  limit = 30,
): string[] {
  const seen = new Map<string, string>() // normalized -> display name
  const sortedByDateDesc = [...history].sort((a, b) => b.date.localeCompare(a.date))
  for (const workout of sortedByDateDesc) {
    for (const set of workout.sets) {
      if (set.entry_type !== entryType) continue
      const key = normalizeExerciseName(set.exercise_name)
      if (!seen.has(key)) seen.set(key, set.exercise_name)
    }
  }
  return Array.from(seen.values()).slice(0, limit)
}
