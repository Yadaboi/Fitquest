// sendFriendRequest (Phase 8): the only way a `friendships` row gets
// created. Resolving an email to a user id requires reading auth.users,
// which is never exposed to PostgREST — this function resolves it via the
// get_user_id_by_email() SECURITY DEFINER function (service-role only)
// and inserts with the service role, mirroring the completeWorkout
// anti-cheat boundary: a client can never insert a friendships row
// directly (see 0004_friends.sql — no insert policy for `authenticated`).

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_REQUESTS_PER_HOUR = 20

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

    // User-scoped client: respects RLS, used only to prove identity via
    // auth.getUser() — same pattern as completeWorkout.
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

    const { email } = await req.json()
    if (typeof email !== 'string' || email.trim().length === 0 || !email.includes('@')) {
      return jsonResponse({ error: 'A valid email is required' }, 400)
    }
    const normalizedEmail = email.trim().toLowerCase()

    // Service-role client: the only client that may resolve auth.users by
    // email or write to friendships.
    const adminClient = createClient(supabaseUrl, serviceKey)

    // Cheap spam/enumeration guard: cap how many requests one user can
    // *send* per hour. Doesn't fully close "probe many emails one at a
    // time via send-then-cancel" — accepted, documented limitation for a
    // personal-scale app — but it raises the cost past casual abuse or an
    // accidental double-submit at zero extra schema cost.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await adminClient
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .gte('created_at', oneHourAgo)
    if ((recentCount ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      return jsonResponse({ error: 'Too many friend requests — try again later' }, 429)
    }

    const { data: targetId, error: lookupError } = await adminClient.rpc('get_user_id_by_email', {
      lookup_email: normalizedEmail,
    })
    if (lookupError) {
      return jsonResponse({ error: 'Could not look up that email — try again' }, 500)
    }
    if (!targetId) {
      return jsonResponse({ error: 'No FitQuest account found with that email' }, 404)
    }
    if (targetId === user.id) {
      return jsonResponse({ error: "You can't send a friend request to yourself" }, 400)
    }

    // Both ids here are server-verified UUIDs (from auth.getUser() and the
    // RPC above), never raw client input, so interpolating them into this
    // filter string carries no injection risk.
    const { data: existing } = await adminClient
      .from('friendships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`,
      )
      .maybeSingle()

    if (existing) {
      return jsonResponse(
        {
          error:
            existing.status === 'accepted'
              ? "You're already friends"
              : 'A friend request is already pending',
        },
        409,
      )
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: targetId, status: 'pending' })
      .select('id')
      .single()

    if (insertError) {
      // Race: two overlapping requests both passed the check above before
      // either committed — the unique index catches it here instead.
      if (insertError.code === '23505') {
        return jsonResponse({ error: 'A friend request is already pending' }, 409)
      }
      return jsonResponse({ error: 'Could not send the friend request' }, 500)
    }

    return jsonResponse({ friendshipId: inserted.id, addresseeId: targetId }, 200)
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
