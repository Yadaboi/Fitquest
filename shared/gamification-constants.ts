// Single source of truth for reward amounts, imported by both the Vite
// client (src/lib/gamification.ts) and the Deno edge function
// (supabase/functions/complete-workout/index.ts). Plain TS, no framework
// dependencies, so both bundlers can pull it in via a relative import.
export const XP_PER_SET = 10
export const COMPLETION_BONUS = 50
export const PR_BONUS = 100

// Session quest thresholds (Phase 7: free-form logging). Strength days ask
// for variety; a cardio day is a single activity, so its bar is duration
// instead of distinct-exercise count.
export const QUEST_MIN_DISTINCT_EXERCISES = 3
export const QUEST_MIN_CARDIO_MINUTES = 20

// AI coach (Phase 9) — this is the one feature with a real per-call dollar
// cost, so limits are deliberately layered: the hourly caps bound bursts,
// the daily cap bounds worst-case cumulative spend even under a bug.
export const COACH_MAX_USER_MESSAGES_PER_HOUR = 20
export const COACH_MAX_POST_WORKOUT_REPLIES_PER_HOUR = 4
export const COACH_MAX_ASSISTANT_REPLIES_PER_DAY = 50
export const COACH_MAX_HISTORY_MESSAGES = 20
