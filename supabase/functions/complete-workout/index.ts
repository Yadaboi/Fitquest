// completeWorkout (Phase 5): the single authoritative reward function.
// The client writes sets directly (RLS-protected, low stakes), but XP,
// PRs, streaks, and shields are only ever computed and written here, using
// the service role — a client can never self-report its own XP.

import { createClient } from 'npm:@supabase/supabase-js@2'

const XP_PER_SET = 10
const COMPLETION_BONUS = 50
const PR_BONUS = 100

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SetRow {
  id: string
  exercise_id: string
  weight: number
  reps: number
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
      .select('id, user_id')
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
      .select('id, exercise_id, weight, reps')
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
      .select('exercise_id, weight, workouts!inner(user_id)')
      .eq('workouts.user_id', user.id)
      .neq('workout_id', workout_id)

    const previousMaxByExercise = new Map<string, number>()
    for (const row of (priorSets ?? []) as { exercise_id: string; weight: number }[]) {
      const current = previousMaxByExercise.get(row.exercise_id) ?? 0
      if (row.weight > current) previousMaxByExercise.set(row.exercise_id, row.weight)
    }

    const prSetIds: string[] = []
    for (const set of workoutSets as SetRow[]) {
      const previousMax = previousMaxByExercise.get(set.exercise_id) ?? 0
      if (set.weight > 0 && previousMax > 0 && set.weight > previousMax) {
        prSetIds.push(set.id)
      }
    }

    const setCount = workoutSets.length
    const prCount = prSetIds.length
    const xpFromSets = setCount * XP_PER_SET
    const xpFromPrs = prCount * PR_BONUS
    const xpAwarded = xpFromSets + xpFromPrs + COMPLETION_BONUS

    // Quest recomputation (server-side, not trusted from the client):
    // "try every exercise in the library" and "beat a previous best."
    const { data: allExercises } = await adminClient.from('exercises').select('id')
    const exerciseIdsInWorkout = new Set(workoutSets.map((s) => s.exercise_id))
    const allExercisesCovered = (allExercises ?? []).every((e) =>
      exerciseIdsInWorkout.has(e.id),
    )
    const hitPr = prCount > 0
    const allQuestsComplete = allExercisesCovered && hitPr

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

    return new Response(
      JSON.stringify({
        xpAwarded,
        prCount,
        newTotalXp,
        streakWeeks,
        shieldAwarded: allQuestsComplete,
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
