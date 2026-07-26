// Hand-authored in the shape `supabase gen types typescript --linked`
// produces, since the Supabase CLI isn't available in this environment.
// Mirrors supabase/migrations/0001_init.sql and 0002_achievements.sql
// exactly. Run the real generator against the linked project and replace
// this file to get a verified, canonical version.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          experience_level: 'new' | 'returning' | null
          weekly_goal: number
          created_at: string
        }
        Insert: {
          id: string
          experience_level?: 'new' | 'returning' | null
          weekly_goal?: number
          created_at?: string
        }
        Update: {
          id?: string
          experience_level?: 'new' | 'returning' | null
          weekly_goal?: number
          created_at?: string
        }
      }
      player_stats: {
        Row: {
          user_id: string
          total_xp: number
          streak_weeks: number
          shield_count: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_xp?: number
          streak_weeks?: number
          shield_count?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          total_xp?: number
          streak_weeks?: number
          shield_count?: number
          updated_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          category: 'push' | 'pull' | 'legs' | 'core'
          cue: string
          is_bodyweight: boolean
        }
        Insert: {
          id: string
          name: string
          category: 'push' | 'pull' | 'legs' | 'core'
          cue: string
          is_bodyweight?: boolean
        }
        Update: {
          id?: string
          name?: string
          category?: 'push' | 'pull' | 'legs' | 'core'
          cue?: string
          is_bodyweight?: boolean
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          date: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      sets: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string
          weight: number
          reps: number
          is_pr: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          weight?: number
          reps: number
          is_pr?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_id?: string
          weight?: number
          reps?: number
          is_pr?: boolean
          created_at?: string
        }
      }
      xp_events: {
        Row: {
          id: string
          user_id: string
          amount: number
          source: 'set' | 'completion' | 'pr' | 'quest'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          source: 'set' | 'completion' | 'pr' | 'quest'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          source?: 'set' | 'completion' | 'pr' | 'quest'
          created_at?: string
        }
      }
      user_achievements: {
        Row: {
          user_id: string
          achievement_id: string
          tier_index: number
          unlocked_at: string
        }
        Insert: {
          user_id: string
          achievement_id: string
          tier_index: number
          unlocked_at?: string
        }
        Update: {
          user_id?: string
          achievement_id?: string
          tier_index?: number
          unlocked_at?: string
        }
      }
    }
  }
}
