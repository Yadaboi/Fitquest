// coachChat (Phase 9): the AI fitness coach. Two triggers share this one
// function — 'chat' (the user asked something) and 'post_workout' (the
// coach speaks first right after a workout finishes). No insight
// computation happens here — shared/coachInsights.ts already turned real
// logged data into facts; this function's only new work is the rate
// limiting, the Claude call, and persisting the transcript.
//
// This is the app's only feature with a real per-call dollar cost, so it
// follows the same anti-cheat write boundary as player_stats/xp_events
// (only the service role may write role='assistant' rows — see
// 0005_coach.sql) plus layered rate limits a $0 feature never needed.

import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { buildCoachFacts } from '../../../shared/coachInsights.ts'
import {
  COACH_MAX_USER_MESSAGES_PER_HOUR,
  COACH_MAX_POST_WORKOUT_REPLIES_PER_HOUR,
  COACH_MAX_ASSISTANT_REPLIES_PER_DAY,
  COACH_MAX_HISTORY_MESSAGES,
} from '../../../shared/gamification-constants.ts'
import { buildSystemPrompt, type PostWorkoutEvent } from './prompt.ts'
import type { CoachWorkout } from '../../../shared/workout-shape.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COACH_MODEL = 'claude-haiku-4-5' // one-line change to upgrade later
const MAX_REPLY_TOKENS = 400

const DAY_TYPES = new Set<string>(['upper', 'lower', 'push', 'pull', 'legs', 'cardio'])

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidPostWorkoutEvent(event: unknown): event is PostWorkoutEvent {
  if (typeof event !== 'object' || event === null) return false
  const e = event as Record<string, unknown>
  return (
    typeof e.dayType === 'string' &&
    DAY_TYPES.has(e.dayType) &&
    typeof e.setCount === 'number' &&
    typeof e.xpAwarded === 'number' &&
    typeof e.newTotalXp === 'number' &&
    typeof e.streakWeeks === 'number' &&
    typeof e.shieldAwarded === 'boolean' &&
    typeof e.prCount === 'number' &&
    Array.isArray(e.unlockedAchievements) &&
    Array.isArray(e.completedQuestTitles)
  )
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const body = await req.json()
    const trigger: 'chat' | 'post_workout' = body?.trigger === 'post_workout' ? 'post_workout' : 'chat'

    let message: string | null = null
    let event: PostWorkoutEvent | null = null

    if (trigger === 'post_workout') {
      if (!isValidPostWorkoutEvent(body?.event)) {
        return jsonResponse({ error: 'Malformed post-workout event' }, 400)
      }
      event = body.event
    } else {
      if (typeof body?.message !== 'string' || body.message.trim().length === 0) {
        return jsonResponse({ error: 'A message is required' }, 400)
      }
      message = body.message.trim().slice(0, 2000)
    }

    // Fail fast, before any DB read/write or rate-limit check — a missing
    // key means every request will fail anyway, and the error should say
    // exactly that instead of surfacing as a generic 500 later.
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return jsonResponse(
        { error: "The AI coach isn't configured yet — an Anthropic API key needs to be added to this project." },
        500,
      )
    }

    // Service-role client: only client allowed to write role='assistant'
    // rows (see 0005_coach.sql — no client insert policy for those), and
    // used for the rate-limit COUNTs below.
    const adminClient = createClient(supabaseUrl, serviceKey)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    if (trigger === 'post_workout') {
      const { count } = await adminClient
        .from('coach_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'assistant')
        .eq('source', 'post_workout')
        .gte('created_at', oneHourAgo)
      if ((count ?? 0) >= COACH_MAX_POST_WORKOUT_REPLIES_PER_HOUR) {
        return jsonResponse({ error: 'Too many post-workout check-ins this hour' }, 429)
      }
    } else {
      const { count } = await adminClient
        .from('coach_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'user')
        .gte('created_at', oneHourAgo)
      if ((count ?? 0) >= COACH_MAX_USER_MESSAGES_PER_HOUR) {
        return jsonResponse(
          { error: "You've reached the hourly limit for coach messages — try again in a bit." },
          429,
        )
      }
    }

    const { count: dailyReplyCount } = await adminClient
      .from('coach_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'assistant')
      .gte('created_at', oneDayAgo)
    if ((dailyReplyCount ?? 0) >= COACH_MAX_ASSISTANT_REPLIES_PER_DAY) {
      return jsonResponse(
        { error: "The coach has hit its daily message limit — it'll be back tomorrow." },
        429,
      )
    }

    // Insert the user's own message first (chat only) so it's included when
    // history is fetched just below — the transcript sent to Claude ends on
    // the real message the user just sent.
    if (trigger === 'chat' && message) {
      const { error: insertUserError } = await userClient
        .from('coach_messages')
        .insert({ user_id: user.id, role: 'user', content: message })
      if (insertUserError) {
        return jsonResponse({ error: 'Could not save your message' }, 500)
      }
    }

    const [{ data: workoutsData }, { data: profile }, { data: playerStats }, { data: historyRows }] =
      await Promise.all([
        userClient
          .from('workouts')
          .select('id, date, day_type, sets(id, exercise_name, entry_type, weight, reps, duration_minutes, is_pr)')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('date', { ascending: true }),
        userClient.from('profiles').select('weekly_goal').eq('id', user.id).single(),
        userClient.from('player_stats').select('total_xp, streak_weeks, shield_count').eq('user_id', user.id).single(),
        userClient
          .from('coach_messages')
          .select('role, content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(COACH_MAX_HISTORY_MESSAGES),
      ])

    const workouts = (workoutsData ?? []) as CoachWorkout[]
    const facts = buildCoachFacts(
      workouts,
      playerStats ?? { total_xp: 0, streak_weeks: 0, shield_count: 0 },
      profile?.weekly_goal ?? 3,
    )

    const systemPrompt = buildSystemPrompt(facts, event)

    const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = (historyRows ?? [])
      .slice()
      .reverse()
      .map((row) => ({ role: row.role as 'user' | 'assistant', content: row.content as string }))

    if (trigger === 'post_workout' && event) {
      // In-memory only — never persisted, so the user never sees a fake
      // message attributed to themselves. Just gives Claude a valid turn
      // to react to, since there's no real user message for this trigger.
      claudeMessages.push({
        role: 'user',
        content: `[App note, not from the user: they just finished a ${event.dayType} workout. React to it — see "Just happened" in your instructions.]`,
      })
    }

    const anthropic = new Anthropic({ apiKey })

    let replyText: string
    try {
      const response = await anthropic.messages.create({
        model: COACH_MODEL,
        max_tokens: MAX_REPLY_TOKENS,
        system: systemPrompt,
        messages: claudeMessages,
      })
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      )
      replyText =
        textBlock?.text.trim() ||
        "I don't have anything to add right now — try asking me something specific."
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        return jsonResponse(
          { error: "The AI coach's API key looks invalid — check the ANTHROPIC_API_KEY secret." },
          500,
        )
      }
      if (err instanceof Anthropic.RateLimitError) {
        return jsonResponse(
          { error: 'The AI coach is getting a lot of requests right now — try again in a minute.' },
          429,
        )
      }
      if (err instanceof Anthropic.APIConnectionError) {
        return jsonResponse(
          { error: "Couldn't reach the AI coach — check your connection and try again." },
          503,
        )
      }
      if (err instanceof Anthropic.APIError) {
        return jsonResponse(
          { error: 'The AI coach is temporarily unavailable — try again shortly.' },
          503,
        )
      }
      return jsonResponse({ error: String(err) }, 500)
    }

    const { data: inserted, error: insertAssistantError } = await adminClient
      .from('coach_messages')
      .insert({
        user_id: user.id,
        role: 'assistant',
        source: trigger,
        content: replyText,
      })
      .select('id')
      .single()

    if (insertAssistantError || !inserted) {
      return jsonResponse({ error: 'Could not save the coach reply' }, 500)
    }

    return jsonResponse({ reply: replyText, messageId: inserted.id }, 200)
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
