// Hand-authored in the shape `supabase gen types typescript --linked`
// produces, since the Supabase CLI isn't available in this environment.
// Mirrors supabase/migrations/0001_init.sql, 0002_achievements.sql,
// 0003_freeform_workouts.sql, and 0004_friends.sql exactly. Run the real
// generator against the linked project and replace this file to get a
// verified, canonical version.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          experience_level: 'new' | 'returning' | null
          weekly_goal: number
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          experience_level?: 'new' | 'returning' | null
          weekly_goal?: number
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          experience_level?: 'new' | 'returning' | null
          weekly_goal?: number
          display_name?: string | null
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
      workouts: {
        Row: {
          id: string
          user_id: string
          date: string
          day_type: 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'cardio' | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          day_type?: 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'cardio' | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          day_type?: 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'cardio' | null
          completed_at?: string | null
          created_at?: string
        }
      }
      sets: {
        Row: {
          id: string
          workout_id: string
          exercise_name: string
          entry_type: 'strength' | 'cardio'
          weight: number | null
          reps: number | null
          duration_minutes: number | null
          is_pr: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_name: string
          entry_type: 'strength' | 'cardio'
          weight?: number | null
          reps?: number | null
          duration_minutes?: number | null
          is_pr?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_name?: string
          entry_type?: 'strength' | 'cardio'
          weight?: number | null
          reps?: number | null
          duration_minutes?: number | null
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
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted'
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: 'pending' | 'accepted'
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          requester_id?: string
          addressee_id?: string
          status?: 'pending' | 'accepted'
          created_at?: string
          responded_at?: string | null
        }
      }
      coach_messages: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          source: 'chat' | 'post_workout'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant'
          source?: 'chat' | 'post_workout'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'assistant'
          source?: 'chat' | 'post_workout'
          content?: string
          created_at?: string
        }
      }
    }
  }
}
