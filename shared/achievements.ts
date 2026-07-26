// Achievement definitions and pure computation, shared between the Vite
// client (progress bars on the Profile page) and the complete-workout edge
// function (persisting unlock records). Deliberately depends on nothing but
// a minimal structural workout shape so it can run in either environment.

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const

export interface AchievementSet {
  exercise_id: string
  weight: number
  reps: number
  is_pr: boolean
}

export interface AchievementWorkout {
  id: string
  sets: AchievementSet[]
}

export interface AchievementStats {
  totalWorkouts: number
  totalPrs: number
  totalVolume: number
  distinctExercises: number
}

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  thresholds: [number, number, number, number]
  getValue: (stats: AchievementStats) => number
}

// Progressive tiers (Phase 2): a handful of categories generate milestone
// moments for years without hand-authoring new content constantly.
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'consistency',
    title: 'Consistency',
    description: 'Complete workouts',
    thresholds: [5, 15, 30, 60],
    getValue: (s) => s.totalWorkouts,
  },
  {
    id: 'personal-records',
    title: 'Record Breaker',
    description: 'Hit personal records',
    thresholds: [1, 5, 15, 30],
    getValue: (s) => s.totalPrs,
  },
  {
    id: 'volume',
    title: 'Total Volume',
    description: 'Lift cumulative weight/reps',
    thresholds: [500, 2000, 6000, 15000],
    getValue: (s) => s.totalVolume,
  },
  {
    id: 'variety',
    title: 'Explorer',
    description: 'Try different exercises',
    thresholds: [1, 2, 3, 4],
    getValue: (s) => s.distinctExercises,
  },
]

export function computeStats(completedWorkouts: AchievementWorkout[]): AchievementStats {
  const allSets = completedWorkouts.flatMap((w) => w.sets)
  return {
    totalWorkouts: completedWorkouts.length,
    totalPrs: allSets.filter((s) => s.is_pr).length,
    totalVolume: allSets.reduce((sum, s) => sum + (s.weight > 0 ? s.weight * s.reps : s.reps), 0),
    distinctExercises: new Set(allSets.map((s) => s.exercise_id)).size,
  }
}

export interface AchievementProgress {
  tierIndex: number // -1 = no tier yet
  value: number
  nextThreshold: number | null
}

export function getAchievementProgress(
  definition: AchievementDefinition,
  stats: AchievementStats,
): AchievementProgress {
  const value = definition.getValue(stats)
  let tierIndex = -1
  for (let i = 0; i < definition.thresholds.length; i++) {
    if (value >= definition.thresholds[i]) tierIndex = i
  }
  const nextThreshold =
    tierIndex + 1 < definition.thresholds.length ? definition.thresholds[tierIndex + 1] : null
  return { tierIndex, value, nextThreshold }
}
