// Single source of truth for reward amounts, imported by both the Vite
// client (src/lib/gamification.ts) and the Deno edge function
// (supabase/functions/complete-workout/index.ts). Plain TS, no framework
// dependencies, so both bundlers can pull it in via a relative import.
export const XP_PER_SET = 10
export const COMPLETION_BONUS = 50
export const PR_BONUS = 100
