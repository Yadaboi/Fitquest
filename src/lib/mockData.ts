import type { Exercise, WorkoutExercise } from '../types/domain'

// Stand-in for the future exercises table. Real content (Phase 2: text + image
// guidance) gets sourced once Supabase is wired up.
export const EXERCISE_LIBRARY: Exercise[] = [
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    category: 'legs',
    cue: 'Hold weight at your chest, sit back and down, chest up.',
    isBodyweight: false,
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    category: 'push',
    cue: 'Hands under shoulders, keep a straight line from head to heels.',
    isBodyweight: true,
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    category: 'pull',
    cue: 'Flat back, pull the weight to your hip, squeeze at the top.',
    isBodyweight: false,
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    cue: 'Forearms down, straight line head to heels, brace your core.',
    isBodyweight: true,
  },
]

// Stand-in for the "smart daily suggestion" logic (Phase 2) — the exercise
// selection itself is still a fixed rotation, but lastPerformance now comes
// from real workout history once the caller has it, and an overdue category
// (see lib/recommendation.ts) gets an extra target set so the recommendation
// actually changes the session instead of just being a comment on it.
export function getTodaysWorkout(
  lastPerformanceByExercise: Record<string, { weight: number; reps: number }> = {},
  focusCategory?: Exercise['category'],
): WorkoutExercise[] {
  return EXERCISE_LIBRARY.map((exercise) => ({
    exercise,
    targetSets: (exercise.isBodyweight ? 3 : 4) + (exercise.category === focusCategory ? 1 : 0),
    lastPerformance: lastPerformanceByExercise[exercise.id] ?? null,
  }))
}
