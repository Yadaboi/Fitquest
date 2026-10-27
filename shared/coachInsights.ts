// Deterministic "intelligence" layer for the AI coach — no LLM anywhere in
// this file. Every function here computes a real signal from real logged
// data; the coach edge function feeds the output of buildCoachFacts to
// Claude as grounded context so it never has to (and is instructed never
// to) invent a number. Reuses the existing pure functions in shared/
// rather than recomputing anything they already cover.

import { normalizeExerciseName } from './exercise-name.ts'
import { computeStats, type AchievementStats } from './achievements.ts'
import { getFocusRecommendation, type FocusRecommendation } from './focusRecommendation.ts'
import { getDayTypeCounts } from './dayTypeCounts.ts'
import { getTrackedBests, type TrackedBests } from './personalBests.ts'
import { getWeeklyGoalProgress, type WeeklyGoalProgress } from './weeklyGoal.ts'
import { getLevelProgress, getRankTitle } from './gamification.ts'
import type { CoachWorkout, DayType } from './workout-shape.ts'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface RecentPr {
  exerciseName: string
  entryType: 'strength' | 'cardio'
  value: number // weight for strength, duration_minutes for cardio
  daysAgo: number
}

// Any is_pr = true set (already server-computed and authoritative by
// complete-workout) within the window — general "new PR" narration,
// independent of a specific just-finished workout's own prCount.
export function getRecentPrs(
  workouts: CoachWorkout[],
  today: Date = new Date(),
  windowDays = 14,
): RecentPr[] {
  const cutoff = today.getTime() - windowDays * MS_PER_DAY
  const results: RecentPr[] = []

  for (const workout of workouts) {
    const workoutDate = new Date(workout.date)
    if (workoutDate.getTime() < cutoff) continue
    const daysAgo = Math.floor((today.getTime() - workoutDate.getTime()) / MS_PER_DAY)
    for (const set of workout.sets) {
      if (!set.is_pr) continue
      const value = set.entry_type === 'strength' ? set.weight : set.duration_minutes
      if (value == null) continue
      results.push({ exerciseName: set.exercise_name, entryType: set.entry_type, value, daysAgo })
    }
  }

  return results.sort((a, b) => a.daysAgo - b.daysAgo)
}

export interface StrengthTrend {
  exerciseName: string
  recentBest: number
  priorBest: number
  deltaAbs: number
}

// Best weight per strength exercise, last `recentDays` vs. the `priorDays`
// immediately before that. Only reported when BOTH windows have data — an
// exercise with nothing in the prior window is a fresh PR, not a "trend."
export function getStrengthTrends(
  workouts: CoachWorkout[],
  today: Date = new Date(),
  recentDays = 30,
  priorDays = 30,
): StrengthTrend[] {
  const recentCutoff = today.getTime() - recentDays * MS_PER_DAY
  const priorCutoff = recentCutoff - priorDays * MS_PER_DAY

  const recentBestByName = new Map<string, { weight: number; displayName: string }>()
  const priorBestByName = new Map<string, { weight: number; displayName: string }>()

  for (const workout of workouts) {
    const t = new Date(workout.date).getTime()
    const isRecent = t >= recentCutoff && t <= today.getTime()
    const isPrior = t >= priorCutoff && t < recentCutoff
    if (!isRecent && !isPrior) continue
    const bucket = isRecent ? recentBestByName : priorBestByName

    for (const set of workout.sets) {
      if (set.entry_type !== 'strength' || set.weight == null) continue
      const key = normalizeExerciseName(set.exercise_name)
      const current = bucket.get(key)
      if (!current || set.weight > current.weight) {
        bucket.set(key, { weight: set.weight, displayName: set.exercise_name })
      }
    }
  }

  const trends: StrengthTrend[] = []
  for (const [key, recent] of recentBestByName) {
    const prior = priorBestByName.get(key)
    if (!prior) continue
    trends.push({
      exerciseName: recent.displayName,
      recentBest: recent.weight,
      priorBest: prior.weight,
      deltaAbs: recent.weight - prior.weight,
    })
  }
  return trends
}

export interface PlateauInsight {
  exerciseName: string
  sessionsInWindow: number
  daysSinceLastPr: number | null
}

// >= minSessions distinct sessions on a strength exercise within
// windowDays, zero PRs in that window. windowDays=30 is roughly one
// training block; minSessions=4 is about weekly cadence — enough
// repetition to expect *some* progress. Fewer sessions than that is "not
// enough data," not a plateau, and isn't reported.
export function detectPlateaus(
  workouts: CoachWorkout[],
  today: Date = new Date(),
  windowDays = 30,
  minSessions = 4,
): PlateauInsight[] {
  const cutoff = today.getTime() - windowDays * MS_PER_DAY
  const statsByName = new Map<
    string,
    { sessions: number; displayName: string; hasPrInWindow: boolean }
  >()

  for (const workout of workouts) {
    const t = new Date(workout.date).getTime()
    if (t < cutoff) continue

    const namesInSession = new Map<string, { displayName: string; hasPr: boolean }>()
    for (const set of workout.sets) {
      if (set.entry_type !== 'strength') continue
      const key = normalizeExerciseName(set.exercise_name)
      const existing = namesInSession.get(key) ?? { displayName: set.exercise_name, hasPr: false }
      if (set.is_pr) existing.hasPr = true
      namesInSession.set(key, existing)
    }

    for (const [key, { displayName, hasPr }] of namesInSession) {
      const stats = statsByName.get(key) ?? { sessions: 0, displayName, hasPrInWindow: false }
      stats.sessions += 1
      if (hasPr) stats.hasPrInWindow = true
      statsByName.set(key, stats)
    }
  }

  const lastPrDateByName = new Map<string, Date>()
  for (const workout of workouts) {
    const workoutDate = new Date(workout.date)
    for (const set of workout.sets) {
      if (set.entry_type !== 'strength' || !set.is_pr) continue
      const key = normalizeExerciseName(set.exercise_name)
      const current = lastPrDateByName.get(key)
      if (!current || workoutDate > current) lastPrDateByName.set(key, workoutDate)
    }
  }

  const plateaus: PlateauInsight[] = []
  for (const [key, stats] of statsByName) {
    if (stats.sessions < minSessions || stats.hasPrInWindow) continue
    const lastPr = lastPrDateByName.get(key)
    const daysSinceLastPr = lastPr
      ? Math.floor((today.getTime() - lastPr.getTime()) / MS_PER_DAY)
      : null
    plateaus.push({
      exerciseName: stats.displayName,
      sessionsInWindow: stats.sessions,
      daysSinceLastPr,
    })
  }
  return plateaus
}

export interface OvertrainingSignal {
  consecutiveDaysTrained: number
}

// Purely a count of consecutive calendar days trained with no rest day,
// ending today or yesterday (so a streak that ended yesterday is still
// caught even if today hasn't been logged yet) — nothing else. Same
// principle as getFocusRecommendation: the app has no soreness/sleep/HR
// data, so this deliberately never claims to measure "recovery," only
// training spacing that's actually in the data.
export function detectOvertrainingRisk(
  workouts: CoachWorkout[],
  today: Date = new Date(),
  consecutiveDayThreshold = 7,
): OvertrainingSignal | null {
  const trainedDates = new Set(workouts.map((w) => new Date(w.date).toDateString()))

  const cursor = new Date(today)
  cursor.setHours(0, 0, 0, 0)
  let daysBack = 0
  while (!trainedDates.has(cursor.toDateString()) && daysBack < 2) {
    cursor.setDate(cursor.getDate() - 1)
    daysBack += 1
  }
  if (!trainedDates.has(cursor.toDateString())) return null // no recent training at all

  let consecutiveDays = 0
  while (trainedDates.has(cursor.toDateString())) {
    consecutiveDays += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  if (consecutiveDays < consecutiveDayThreshold) return null
  return { consecutiveDaysTrained: consecutiveDays }
}

export interface ConsistencyTrend {
  recentPerWeek: number
  priorPerWeek: number
  direction: 'up' | 'down' | 'flat'
}

// Workout rate, last windowDays vs. the windowDays before that, normalized
// to a weekly rate. +/-15% is treated as noise, not a real trend.
export function getConsistencyTrend(
  workouts: CoachWorkout[],
  today: Date = new Date(),
  windowDays = 28,
): ConsistencyTrend | null {
  if (workouts.length === 0) return null

  const recentCutoff = today.getTime() - windowDays * MS_PER_DAY
  const priorCutoff = recentCutoff - windowDays * MS_PER_DAY

  const earliestDate = workouts.reduce(
    (min, w) => Math.min(min, new Date(w.date).getTime()),
    Infinity,
  )
  // Without real history covering the prior window too, the comparison is
  // meaningless (e.g. someone who started 10 days ago would show a fake
  // "0 -> N" trend that's really just "no data yet").
  if (earliestDate > priorCutoff) return null

  let recentCount = 0
  let priorCount = 0
  for (const w of workouts) {
    const t = new Date(w.date).getTime()
    if (t >= recentCutoff && t <= today.getTime()) recentCount += 1
    else if (t >= priorCutoff && t < recentCutoff) priorCount += 1
  }

  const weeks = windowDays / 7
  const recentPerWeek = recentCount / weeks
  const priorPerWeek = priorCount / weeks

  let direction: 'up' | 'down' | 'flat' = 'flat'
  if (priorPerWeek > 0) {
    const change = (recentPerWeek - priorPerWeek) / priorPerWeek
    if (change > 0.15) direction = 'up'
    else if (change < -0.15) direction = 'down'
  } else if (recentPerWeek > 0) {
    direction = 'up'
  }

  return {
    recentPerWeek: Math.round(recentPerWeek * 10) / 10,
    priorPerWeek: Math.round(priorPerWeek * 10) / 10,
    direction,
  }
}

export interface CoachFacts {
  totals: AchievementStats
  weeklyGoal: WeeklyGoalProgress
  dayTypeCounts: Record<DayType, number>
  focusRecommendation: FocusRecommendation | null
  trackedBests: TrackedBests
  recentPrs: RecentPr[]
  strengthTrends: StrengthTrend[]
  plateaus: PlateauInsight[]
  overtraining: OvertrainingSignal | null
  consistency: ConsistencyTrend | null
  level: number
  rankTitle: string
  totalXp: number
  streakWeeks: number
  shieldCount: number
}

export function buildCoachFacts(
  workouts: CoachWorkout[],
  playerStats: { total_xp: number; streak_weeks: number; shield_count: number },
  weeklyGoalTarget: number,
  today: Date = new Date(),
): CoachFacts {
  const { level } = getLevelProgress(playerStats.total_xp)
  return {
    totals: computeStats(workouts),
    weeklyGoal: getWeeklyGoalProgress(workouts, weeklyGoalTarget, today),
    dayTypeCounts: getDayTypeCounts(workouts),
    focusRecommendation: getFocusRecommendation(workouts, today),
    trackedBests: getTrackedBests(workouts),
    recentPrs: getRecentPrs(workouts, today),
    strengthTrends: getStrengthTrends(workouts, today),
    plateaus: detectPlateaus(workouts, today),
    overtraining: detectOvertrainingRisk(workouts, today),
    consistency: getConsistencyTrend(workouts, today),
    level,
    rankTitle: getRankTitle(level),
    totalXp: playerStats.total_xp,
    streakWeeks: playerStats.streak_weeks,
    shieldCount: playerStats.shield_count,
  }
}
