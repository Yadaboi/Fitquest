// System prompt construction for the AI coach. Presentation only — turning
// already-computed facts (shared/coachInsights.ts) into text for Claude.
// No insight computation happens in this file.

import { TIER_NAMES, ACHIEVEMENT_DEFINITIONS } from '../../../shared/achievements.ts'
import { DAY_TYPE_LABELS, DAY_TYPES } from '../../../shared/focusRecommendation.ts'
import { getLevelProgress } from '../../../shared/gamification.ts'
import type { CoachFacts } from '../../../shared/coachInsights.ts'
import type { DayType } from '../../../shared/workout-shape.ts'

export interface PostWorkoutEvent {
  dayType: DayType
  setCount: number
  xpAwarded: number
  newTotalXp: number
  streakWeeks: number
  shieldAwarded: boolean
  prCount: number
  unlockedAchievements: { id: string; tier: number }[]
  completedQuestTitles: string[]
}

const COACH_PERSONA = `You are this person's personal strength and fitness coach inside FitQuest, the workout-tracking app they use to log every session. You've been coaching them since they started — you know their training history and talk to them like a real coach who's actually paying attention, not a customer-support bot.

Voice:
- Knowledgeable and direct. You understand training; say what you mean without padding.
- Supportive, not a cheerleader. Skip exclamation-point enthusiasm and generic hype ("Amazing job!! Keep crushing it!"). Earn any praise by being specific about what actually happened.
- Short by default — a sentence or two is usually enough. Only go longer when something genuinely needs explaining, like why a plateau might be happening or what to try differently next session.
- Vary how you open and how you react. Don't reuse the same phrases turn after turn. If you've already reacted to something earlier in this conversation, don't congratulate them on it again the same way.
- Never invent a number. Every statistic you mention — weight, reps, streak length, days since something, XP, level — must come from the "Athlete data" section below. If you don't have a number for something, say so plainly instead of guessing.
- You have no soreness, sleep, heart-rate, or other recovery data — never claim to, and never invent a "recovery score." When you talk about overtraining risk, it's purely about how many days in a row they've trained with no rest day, and say so if asked why.
- Weights have no stored unit in this app. State the number as-is; don't assume or state kg or lb.
- You're a coach, not a report generator. Don't recite the whole data dump back — pull out what's relevant to what they just asked or what just happened, and leave the rest unsaid.`

function formatWeightLine(label: string, best: { weight: number; reps: number } | null): string {
  return best ? `${label}: ${best.weight} x ${best.reps}` : `${label}: no data yet`
}

function formatMileTime(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatCoachFacts(facts: CoachFacts): string {
  const splitLine = DAY_TYPES.map((d: DayType) => `${DAY_TYPE_LABELS[d]} ${facts.dayTypeCounts[d]}`).join(
    ', ',
  )

  const overdueLine = facts.focusRecommendation
    ? facts.focusRecommendation.message
    : 'nothing is meaningfully overdue right now'

  const recentPrsLine =
    facts.recentPrs.length > 0
      ? facts.recentPrs
          .map((pr) => `${pr.exerciseName}: ${pr.value} (${pr.daysAgo}d ago)`)
          .join('; ')
      : 'none in the last 14 days'

  const strengthTrendLine =
    facts.strengthTrends.length > 0
      ? facts.strengthTrends
          .map(
            (t) =>
              `${t.exerciseName}: ${t.recentBest} vs ${t.priorBest} (${t.deltaAbs >= 0 ? '+' : ''}${t.deltaAbs})`,
          )
          .join('; ')
      : 'not enough history yet to compare'

  const plateauLine =
    facts.plateaus.length > 0
      ? facts.plateaus
          .map(
            (p) =>
              `${p.exerciseName} (${p.sessionsInWindow} sessions, no PR${p.daysSinceLastPr != null ? `, last PR ${p.daysSinceLastPr}d ago` : ''})`,
          )
          .join('; ')
      : 'none detected'

  const overtrainingLine = facts.overtraining
    ? `${facts.overtraining.consecutiveDaysTrained} days in a row trained with no rest day`
    : 'no extended no-rest stretch right now'

  const consistencyLine = facts.consistency
    ? `${facts.consistency.recentPerWeek}/wk over the last 4 weeks vs ${facts.consistency.priorPerWeek}/wk before that (${facts.consistency.direction})`
    : 'not enough history yet to compare'

  return `Athlete data (as of right now — this is ground truth, not memory; "not enough data yet" or "none" is an accurate answer and fine to say):
- Level ${facts.level} (${facts.rankTitle}), ${facts.totalXp} total XP, ${facts.streakWeeks}-week streak, ${facts.shieldCount} shield(s) held
- This week: ${facts.weeklyGoal.completed}/${facts.weeklyGoal.goal} workouts toward their goal
- All-time: ${facts.totals.totalWorkouts} workouts, ${facts.totals.totalPrs} PRs, ${facts.totals.totalVolume} total strength volume (weight x reps, unitless), ${facts.totals.distinctExercises} distinct exercises tried
- Training split (all-time): ${splitLine}
- Most overdue: ${overdueLine}
- Tracked lifts — ${formatWeightLine('Bench', facts.trackedBests.bench)}, ${formatWeightLine('Squat', facts.trackedBests.squat)}, ${formatWeightLine('Deadlift', facts.trackedBests.deadlift)}, Mile Run: ${facts.trackedBests.mileRunMinutes != null ? formatMileTime(facts.trackedBests.mileRunMinutes) : 'no data yet'}
- Recent PRs (last 14 days): ${recentPrsLine}
- Strength trend (last 30 days vs the 30 before): ${strengthTrendLine}
- Possible plateaus (4+ sessions in 30 days, no PR): ${plateauLine}
- Training spacing: ${overtrainingLine}
- Consistency trend: ${consistencyLine}`
}

export function formatPostWorkoutEvent(event: PostWorkoutEvent): string {
  const prevLevel = getLevelProgress(event.newTotalXp - event.xpAwarded).level
  const newLevel = getLevelProgress(event.newTotalXp).level
  const leveledUp = newLevel > prevLevel

  const achievementsLine =
    event.unlockedAchievements.length > 0
      ? event.unlockedAchievements
          .map((u) => {
            const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === u.id)
            return `${def?.title ?? u.id} (${TIER_NAMES[u.tier] ?? u.tier})`
          })
          .join('; ')
      : 'none'

  const questLine = event.completedQuestTitles.length > 0 ? event.completedQuestTitles.join('; ') : 'none'

  return `Just happened — this is why you're speaking first, before they've asked you anything:
- Finished a ${DAY_TYPE_LABELS[event.dayType]} workout: ${event.setCount} logged
- XP: +${event.xpAwarded} (now ${event.newTotalXp} total)${leveledUp ? `, leveled up from ${prevLevel} to ${newLevel}` : ''}
- PRs this session: ${event.prCount}${event.prCount > 0 ? ' — call these out specifically' : ''}
- ${event.shieldAwarded ? 'Earned a shield this session' : 'No shield this session'}
- Session quests completed: ${questLine}
- Achievements unlocked: ${achievementsLine}

Open with a short, genuine reaction to what just happened. Don't wait to be asked, and don't just read this list back — pick what's actually worth saying.`
}

export function buildSystemPrompt(facts: CoachFacts, event: PostWorkoutEvent | null): string {
  const blocks = [COACH_PERSONA, formatCoachFacts(facts)]
  if (event) blocks.push(formatPostWorkoutEvent(event))
  return blocks.join('\n\n')
}
