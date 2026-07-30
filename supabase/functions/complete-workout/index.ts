// completeWorkout (Phase 5): the single authoritative reward function.
// The client writes sets directly (RLS-protected, low stakes), but XP,
// PRs, streaks, and shields are only ever computed and written here, using
// the service role — a client can never self-report its own XP.

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  XP_PER_SET,
  COMPLETION_BONUS,
  PR_BONUS,
  QUEST_MIN_DISTINCT_EXERCISES,
  QUEST_MIN_CARDIO_MINUTES,
} from '../../../shared/gamification-constants.ts'
import {
  ACHIEVEMENT_DEFINITIONS,
  computeStats,
  getAchievementProgress,
  type AchievementWorkout,
} from '../../../shared/achievements.ts'
import { normalizeExerciseName } from '../../../shared/exercise-name.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SetRow {
  id: string
  exercise_name: string
  entry_type: 'strength' | 'cardio'
  weight: number | null
  reps: number | null
  duration_minutes: number | null
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${week}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User-scoped client: respects RLS, used to safely read only what this
    // caller is allowed to see (proves workout ownership for free).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { workout_id } = await req.json()
    if (!workout_id) {
      return new Response(JSON.stringify({ error: 'workout_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Confirms ownership implicitly: RLS only returns this row if it's the
    // caller's own workout.
    const { data: workout, error: workoutError } = await userClient
      .from('workouts')
      .select('id, user_id, day_type')
      .eq('id', workout_id)
      .single()
    if (workoutError || !workout) {
      return new Response(JSON.stringify({ error: 'Workout not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: workoutSets, error: setsError } = await userClient
      .from('sets')
      .select('id, exercise_name, entry_type, weight, reps, duration_minutes')
      .eq('workout_id', workout_id)
    if (setsError || !workoutSets || workoutSets.length === 0) {
      return new Response(JSON.stringify({ error: 'No sets logged for this workout' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service-role client: bypasses RLS. Only used for the privileged
    // reads/writes below (cross-workout history, player_stats, xp_events).
    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: priorSets } = await adminClient
      .from('sets')
      .select('exercise_name, entry_type, weight, duration_minutes, workouts!inner(user_id)')
      .eq('workouts.user_id', user.id)
      .neq('workout_id', workout_id)

    // PR detection, split by entry type and keyed by normalized name so the
    // same lift/activity logged with different casing/whitespace still
    // matches across sessions. A strength PR beats a prior max weight; a
    // cardio PR beats a prior max duration for that same activity — "longest
    // run yet" is exactly as real a personal best as "heaviest squat yet."
    const previousMaxWeightByName = new Map<string, number>()
    const previousMaxDurationByName = new Map<string, number>()
    for (const row of (priorSets ?? []) as {
      exercise_name: string
      entry_type: 'strength' | 'cardio'
      weight: number | null
      duration_minutes: number | null
    }[]) {
      const key = normalizeExerciseName(row.exercise_name)
      if (row.entry_type === 'strength' && row.weight != null) {
        const current = previousMaxWeightByName.get(key) ?? 0
        if (row.weight > current) previousMaxWeightByName.set(key, row.weight)
      } else if (row.entry_type === 'cardio' && row.duration_minutes != null) {
        const current = previousMaxDurationByName.get(key) ?? 0
        if (row.duration_minutes > current) previousMaxDurationByName.set(key, row.duration_minutes)
      }
    }

    const prSetIds: string[] = []
    for (const set of workoutSets as SetRow[]) {
      const key = normalizeExerciseName(set.exercise_name)
      if (set.entry_type === 'strength' && set.weight != null) {
        const previousMax = previousMaxWeightByName.get(key) ?? 0
        if (set.weight > 0 && previousMax > 0 && set.weight > previousMax) {
          prSetIds.push(set.id)
        }
      } else if (set.entry_type === 'cardio' && set.duration_minutes != null) {
        const previousMax = previousMaxDurationByName.get(key) ?? 0
        if (previousMax > 0 && set.duration_minutes > previousMax) {
          prSetIds.push(set.id)
        }
      }
    }

    const setCount = workoutSets.length
    const prCount = prSetIds.length
    const xpFromSets = setCount * XP_PER_SET
    const xpFromPrs = prCount * PR_BONUS
    const xpAwarded = xpFromSets + xpFromPrs + COMPLETION_BONUS

    // Quest recomputation (server-side, not trusted from the client). There's
    // no fixed catalog to "complete every exercise" from anymore — a cardio
    // day asks for a minimum duration instead, since requiring several
    // distinct exercises on a single-activity cardio day would be an unfair
    // bar.
    const isCardioDay = workout.day_type === 'cardio'
    const questProgressComplete = isCardioDay
      ? workoutSets
          .filter((s) => s.entry_type === 'cardio')
          .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) >= QUEST_MIN_CARDIO_MINUTES
      : new Set(
          workoutSets
            .filter((s) => s.entry_type === 'strength')
            .map((s) => normalizeExerciseName(s.exercise_name)),
        ).size >= QUEST_MIN_DISTINCT_EXERCISES
    const hitPr = prCount > 0
    const allQuestsComplete = questProgressComplete && hitPr

    // Streak: consecutive weeks (ending this week) with completed-workout
    // count >= the user's weekly goal. Recomputed fresh each time rather
    // than incrementally tracked — simpler and self-correcting.
    const { data: profile } = await adminClient
      .from('profiles')
      .select('weekly_goal')
      .eq('id', user.id)
      .single()
    const weeklyGoal = profile?.weekly_goal ?? 3

    const { data: allWorkouts } = await adminClient
      .from('workouts')
      .select('date')
      .eq('user_id', user.id)

    const countByWeek = new Map<string, number>()
    for (const w of allWorkouts ?? []) {
      const key = isoWeekKey(new Date(w.date))
      countByWeek.set(key, (countByWeek.get(key) ?? 0) + 1)
    }

    let streakWeeks = 0
    const cursor = new Date()
    for (let i = 0; i < 520; i++) {
      const key = isoWeekKey(cursor)
      const count = countByWeek.get(key) ?? 0
      if (count >= weeklyGoal) {
        streakWeeks += 1
        cursor.setDate(cursor.getDate() - 7)
      } else {
        break
      }
    }

    // Writes: sets.is_pr correction, workout completion timestamp,
    // player_stats totals, and the xp_events audit trail — one row per
    // award, matching the Phase 4 event-log design.
    if (prSetIds.length > 0) {
      await adminClient.from('sets').update({ is_pr: true }).in('id', prSetIds)
    }
    await adminClient
      .from('workouts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', workout_id)

    const { data: currentStats } = await adminClient
      .from('player_stats')
      .select('total_xp, shield_count')
      .eq('user_id', user.id)
      .single()

    const newTotalXp = (currentStats?.total_xp ?? 0) + xpAwarded
    const newShieldCount = (currentStats?.shield_count ?? 0) + (allQuestsComplete ? 1 : 0)

    await adminClient
      .from('player_stats')
      .update({
        total_xp: newTotalXp,
        streak_weeks: streakWeeks,
        shield_count: newShieldCount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    const xpEvents = [
      ...Array(setCount).fill({ user_id: user.id, amount: XP_PER_SET, source: 'set' }),
      ...Array(prCount).fill({ user_id: user.id, amount: PR_BONUS, source: 'pr' }),
      { user_id: user.id, amount: COMPLETION_BONUS, source: 'completion' },
    ]
    await adminClient.from('xp_events').insert(xpEvents)

    // Achievement unlock persistence: recompute tiers from this user's full
    // completed-workout history (the workout just finished above is already
    // included, since its completed_at was written earlier in this request)
    // and persist any tier that's newly been crossed. Reads use the
    // user-scoped client (RLS already allows selecting one's own data);
    // only the upsert needs the service role, since clients have no write
    // policy on user_achievements — same anti-cheat boundary as player_stats.
    const { data: achievementWorkouts } = await userClient
      .from('workouts')
      .select('id, sets(exercise_name, entry_type, weight, reps, duration_minutes, is_pr)')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)

    const achievementStats = computeStats(
      (achievementWorkouts ?? []) as AchievementWorkout[],
    )

    const { data: existingUnlocks } = await userClient
      .from('user_achievements')
      .select('achievement_id, tier_index')
      .eq('user_id', user.id)

    const existingTierByAchievement = new Map<string, number>(
      (existingUnlocks ?? []).map((row) => [row.achievement_id, row.tier_index]),
    )

    const unlockedAchievements: { id: string; tier: number }[] = []
    const achievementUpserts: {
      user_id: string
      achievement_id: string
      tier_index: number
    }[] = []

    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      const { tierIndex } = getAchievementProgress(definition, achievementStats)
      const previousTier = existingTierByAchievement.get(definition.id) ?? -1
      if (tierIndex > previousTier) {
        unlockedAchievements.push({ id: definition.id, tier: tierIndex })
        achievementUpserts.push({
          user_id: user.id,
          achievement_id: definition.id,
          tier_index: tierIndex,
        })
      }
    }

    if (achievementUpserts.length > 0) {
      await adminClient
        .from('user_achievements')
        .upsert(achievementUpserts, { onConflict: 'user_id,achievement_id' })
    }

    return new Response(
      JSON.stringify({
        xpAwarded,
        prCount,
        newTotalXp,
        streakWeeks,
        shieldAwarded: allQuestsComplete,
        unlockedAchievements,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
