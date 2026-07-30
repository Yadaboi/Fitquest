// DB row shapes, derived from the generated Database type (src/types/database.ts).
// For in-session UI shapes (the active workout being logged before it's
// persisted), see types/domain.ts instead — that boundary is intentional.
import type { Database } from './database'

export type ExperienceLevel = NonNullable<
  Database['public']['Tables']['profiles']['Row']['experience_level']
>

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type PlayerStatsRow = Database['public']['Tables']['player_stats']['Row']
export type WorkoutRow = Database['public']['Tables']['workouts']['Row']
export type SetRow = Database['public']['Tables']['sets']['Row']
export type XpEventRow = Database['public']['Tables']['xp_events']['Row']
export type UserAchievementRow = Database['public']['Tables']['user_achievements']['Row']
