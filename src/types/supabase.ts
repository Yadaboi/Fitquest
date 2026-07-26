export type ExperienceLevel = 'new' | 'returning'

export interface ProfileRow {
  id: string
  experience_level: ExperienceLevel | null
  weekly_goal: number
  created_at: string
}

export interface PlayerStatsRow {
  user_id: string
  total_xp: number
  streak_weeks: number
  shield_count: number
  updated_at: string
}
