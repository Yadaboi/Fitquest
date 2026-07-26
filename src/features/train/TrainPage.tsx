import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getTodaysWorkout } from '../../lib/mockData'
import { XP_PER_SET, PR_BONUS } from '../../lib/gamification'
import { useWorkoutHistory, getLastPerformanceByExercise } from '../../hooks/useWorkoutHistory'
import { ExerciseCard } from './ExerciseCard'
import { XpTickStack, type XpTick } from '../../components/ui/XpTickStack'
import { Celebration, type CelebrationData } from '../../components/ui/Celebration'
import type { LoggedSet, SessionQuest } from '../../types/domain'

let tickIdCounter = 0

export function TrainPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const userId = session!.user.id

  const { data: history } = useWorkoutHistory(userId)
  const workout = useMemo(
    () => getTodaysWorkout(getLastPerformanceByExercise(history ?? [])),
    [history],
  )

  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [loggedByExercise, setLoggedByExercise] = useState<Record<string, LoggedSet[]>>({})
  const [ticks, setTicks] = useState<XpTick[]>([])
  const [celebration, setCelebration] = useState<CelebrationData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [quests, setQuests] = useState<SessionQuest[]>([
    { id: 'all-exercises', title: 'Complete every exercise', isComplete: false },
    { id: 'beat-best', title: 'Beat a previous best on any lift', isComplete: false },
  ])

  const totalLoggedSets = Object.values(loggedByExercise).reduce(
    (sum, sets) => sum + sets.length,
    0,
  )

  function pushTick(amount: number) {
    const id = `tick-${tickIdCounter++}`
    setTicks((prev) => [...prev, { id, amount }])
    window.setTimeout(() => {
      setTicks((prev) => prev.filter((t) => t.id !== id))
    }, 700)
  }

  function updateQuestProgress(nextLoggedByExercise: Record<string, LoggedSet[]>, hitPr: boolean) {
    const nextQuests = quests.map((quest) => {
      if (quest.isComplete) return quest
      if (quest.id === 'beat-best' && hitPr) return { ...quest, isComplete: true }
      if (quest.id === 'all-exercises') {
        const allDone = workout.every(
          (we) => (nextLoggedByExercise[we.exercise.id]?.length ?? 0) >= we.targetSets,
        )
        if (allDone) return { ...quest, isComplete: true }
      }
      return quest
    })
    setQuests(nextQuests)
  }

  async function ensureWorkout(): Promise<string> {
    if (workoutId) return workoutId
    const { data, error } = await supabase
      .from('workouts')
      .insert({ user_id: userId })
      .select('id')
      .single()
    if (error || !data) throw error ?? new Error('Failed to create workout')
    setWorkoutId(data.id)
    return data.id
  }

  async function handleLogSet(exerciseId: string, weight: number, reps: number) {
    setErrorMessage(null)
    const workoutExercise = workout.find((we) => we.exercise.id === exerciseId)
    const lastWeight = workoutExercise?.lastPerformance?.weight ?? 0
    // Optimistic guess for immediate feedback (Phase 5) — the completeWorkout
    // function recomputes the authoritative is_pr value at the end.
    const isPr = !workoutExercise?.exercise.isBodyweight && weight > lastWeight && lastWeight > 0

    try {
      const currentWorkoutId = await ensureWorkout()
      const { data, error } = await supabase
        .from('sets')
        .insert({ workout_id: currentWorkoutId, exercise_id: exerciseId, weight, reps, is_pr: isPr })
        .select('id')
        .single()
      if (error || !data) throw error ?? new Error('Failed to log set')

      const newSet: LoggedSet = { id: data.id, exerciseId, weight, reps, isPr }
      const nextLoggedByExercise = {
        ...loggedByExercise,
        [exerciseId]: [...(loggedByExercise[exerciseId] ?? []), newSet],
      }
      setLoggedByExercise(nextLoggedByExercise)
      pushTick(XP_PER_SET)

      if (isPr) {
        setCelebration({
          title: 'New Personal Record',
          subtitle: workoutExercise?.exercise.name ?? '',
          amount: PR_BONUS,
        })
      }

      updateQuestProgress(nextLoggedByExercise, isPr)
    } catch (err) {
      setErrorMessage('Could not save that set — check your connection and try again.')
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

    setCelebration({
      title: 'Workout Complete',
      subtitle: `${totalLoggedSets} sets logged`,
      amount: data.xpAwarded,
    })
  }

  function handleDismissCelebration() {
    const wasCompletion = celebration?.title === 'Workout Complete'
    setCelebration(null)
    if (wasCompletion) navigate('/')
  }

  return (
    <div className="flex flex-col gap-4">
      <XpTickStack ticks={ticks} />
      <Celebration data={celebration} onDismiss={handleDismissCelebration} />

      <header>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Full Body — Day 1</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{totalLoggedSets} sets logged</p>
      </header>

      {errorMessage && (
        <p className="rounded-lg border border-[var(--color-danger)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      )}

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

      {workout.map((workoutExercise) => (
        <ExerciseCard
          key={workoutExercise.exercise.id}
          workoutExercise={workoutExercise}
          loggedSets={loggedByExercise[workoutExercise.exercise.id] ?? []}
          onLogSet={(weight, reps) => handleLogSet(workoutExercise.exercise.id, weight, reps)}
        />
      ))}

      <button
        type="button"
        onClick={handleFinishWorkout}
        disabled={totalLoggedSets === 0 || isFinishing}
        className="mt-2 w-full rounded-xl bg-[var(--color-celebration)] py-3 text-sm font-semibold text-[var(--color-celebration-foreground)] disabled:opacity-40"
      >
        {isFinishing ? 'Finishing...' : 'Finish Workout'}
      </button>
    </div>
  )
}
