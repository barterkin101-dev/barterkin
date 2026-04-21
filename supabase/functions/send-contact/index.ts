// Phase 5 — send-contact Edge Function
// Purpose: eligibility check → rate limits → contact_requests insert → Resend send → PostHog capture
// Source: 05-RESEARCH.md §Pattern 1 + 05-PATTERNS.md + 05-UI-SPEC.md §Copywriting Contract
// Security: verify_jwt=true (Supabase CLI default; see supabase/config.toml [functions.send-contact])
// CRITICAL: replyTo is ALWAYS senderEmail from validated JWT — NEVER from request body (Pitfall §15)

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { PostHog } from 'posthog-node'
import ContactRelayEmail from './email.tsx'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const posthogApiKey = Deno.env.get('POSTHOG_API_KEY')!
const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'Barterkin <noreply@barterkin.com>'
const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://barterkin.com'

const DAILY_CAP = 5
const WEEKLY_CAP = 20
const PER_RECIPIENT_WEEKLY_CAP = 2

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ code: 'unknown', error: 'Method not allowed' }, 405)
  }

  // Extract JWT from Authorization header
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ code: 'unauthorized', error: 'Please sign in.' }, 401)
  }
  const jwt = authHeader.slice('Bearer '.length)

  // Service-role client (inline — NOT imported from lib/supabase/admin.ts; Deno is separate runtime)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Validate JWT by fetching user (revalidates against auth server — no getSession()!)
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return json({ code: 'unauthorized', error: 'Please sign in.' }, 401)
  }
  const sender = userData.user
  const senderId = sender.id
  const senderEmail = sender.email!

  // Email-verify gate (CONT-03 + trust floor)
  if (!sender.email_confirmed_at) {
    return json(
      { code: 'unverified', error: 'Verify your email before contacting members.' },
      403,
    )
  }

  // Parse and validate request body
  let body: { recipient_profile_id?: unknown; message?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ code: 'bad_message', error: 'Invalid request body.' }, 400)
  }

  const recipientProfileId = body.recipient_profile_id
  const rawMessage = body.message

  if (
    typeof recipientProfileId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(recipientProfileId)
  ) {
    return json({ code: 'bad_message', error: 'Invalid recipient.' }, 400)
  }
  if (typeof rawMessage !== 'string') {
    return json({ code: 'bad_message', error: 'Message required.' }, 400)
  }
  const message = rawMessage.trim()
  if (message.length < 20) {
    return json({ code: 'bad_message', error: 'Your message is too short.' }, 400)
  }
  if (message.length > 500) {
    return json({ code: 'bad_message', error: 'Your message is too long.' }, 400)
  }

  // Eligibility check via single RPC call (TRUST-07)
  const { data: elig, error: eligErr } = await supabase
    .rpc('contact_eligibility', {
      p_sender_owner_id: senderId,
      p_recipient_profile_id: recipientProfileId,
    })
    .single()

  if (eligErr || !elig) {
    console.error('[send-contact] eligibility failed', { code: eligErr?.code })
    return json({ code: 'unknown', error: 'Something went wrong.' }, 500)
  }

  // Eligibility gates — in priority order
  if (elig.sender_banned) {
    return json({ code: 'sender_banned', error: 'Your account is suspended.' }, 403)
  }
  // DO NOT reveal ban status vs block status — use same copy (Pitfall §15 + T-5-03-04)
  if (elig.recipient_banned) {
    return json({ code: 'recipient_unreachable', error: "This member isn't reachable." }, 403)
  }
  if (!elig.accepting_contact) {
    return json(
      {
        code: 'not_accepting',
        error: `${elig.recipient_display_name} isn't accepting messages right now.`,
      },
      403,
    )
  }
  // DO NOT reveal block status to a blocked sender — use same copy as recipient_unreachable (Pitfall §15)
  if (elig.blocked_by_recipient) {
    return json(
      { code: 'recipient_unreachable', error: `${elig.recipient_display_name} isn't reachable.` },
      403,
    )
  }
  if (elig.blocked_by_sender) {
    return json(
      {
        code: 'sender_blocked',
        error: `You've blocked ${elig.recipient_display_name}. Contact an admin if you want to unblock.`,
      },
      403,
    )
  }

  // Rate limit checks — 3-layer defense (CONT-07, CONT-08)
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Layer 1: Daily cap (≤5 per sender per day)
  const { count: dailyCount } = await supabase
    .from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', elig.sender_profile_id)
    .gte('created_at', dayAgo)
    .eq('status', 'sent')

  if ((dailyCount ?? 0) >= DAILY_CAP) {
    return json(
      {
        code: 'daily_cap',
        error: "You've reached your daily contact limit. You can send more messages tomorrow.",
      },
      429,
    )
  }

  // Layer 2: Weekly cap (≤20 per sender per week)
  const { count: weeklyCount } = await supabase
    .from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', elig.sender_profile_id)
    .gte('created_at', weekAgo)
    .eq('status', 'sent')

  if ((weeklyCount ?? 0) >= WEEKLY_CAP) {
    return json(
      { code: 'weekly_cap', error: "You've reached your weekly contact limit." },
      429,
    )
  }

  // Layer 3: Per-pair weekly cap (≤2 contacts to same recipient per week)
  const { count: pairCount } = await supabase
    .from('contact_requests')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', elig.sender_profile_id)
    .eq('recipient_id', recipientProfileId)
    .gte('created_at', weekAgo)
    .eq('status', 'sent')

  if ((pairCount ?? 0) >= PER_RECIPIENT_WEEKLY_CAP) {
    return json(
      {
        code: 'pair_cap',
        error: `You've already contacted ${elig.recipient_display_name} this week.`,
      },
      429,
    )
  }

  // Insert contact_requests row (service-role only — no INSERT policy for authenticated)
  const { data: request, error: insertErr } = await supabase
    .from('contact_requests')
    .insert({
      sender_id: elig.sender_profile_id,
      recipient_id: recipientProfileId,
      message,
      status: 'sent',
    })
    .select('id')
    .single()

  if (insertErr || !request) {
    // 23505 = unique_violation (pair_day partial unique index from Plan 02)
    if (insertErr?.code === '23505') {
      return json(
        {
          code: 'pair_dup',
          error: `You've already contacted ${elig.recipient_display_name} today.`,
        },
        429,
      )
    }
    console.error('[send-contact] insert failed', { code: insertErr?.code })
    return json({ code: 'unknown', error: 'Something went wrong.' }, 500)
  }

  // Send email via Resend (CONT-05)
  // CRITICAL: replyTo is senderEmail from validated JWT — NEVER from request body (T-5-03-06)
  const resend = new Resend(resendApiKey)
  const senderProfileUrl = `${siteUrl}/m/${elig.sender_username}`

  const { data: sent, error: sendErr } = await resend.emails.send({
    from: emailFrom,
    to: elig.recipient_email,
    replyTo: senderEmail, // server-assigned from auth.users.email — not from request body
    subject: `${elig.sender_display_name} wants to barter with you`, // D-11 verbatim
    react: ContactRelayEmail({
      senderDisplayName: elig.sender_display_name,
      senderUsername: elig.sender_username,
      message,
      profileUrl: senderProfileUrl,
    }),
    headers: {
      'X-Entity-Ref-ID': request.id, // CONT-05: idempotency header
    },
  })

  if (sendErr || !sent) {
    // Mark as failed so bounce webhook doesn't interfere
    await supabase.from('contact_requests').update({ status: 'failed' }).eq('id', request.id)
    console.error('[send-contact] resend failed', { code: (sendErr as { name?: string })?.name })
    return json({ code: 'send_failed', error: 'Something went wrong sending your message.' }, 502)
  }

  // Update resend_id for webhook correlation (CONT-09)
  await supabase.from('contact_requests').update({ resend_id: sent.id }).eq('id', request.id)

  // PostHog server-side capture (CONT-11) — anonymized distinctId (SHA-256 of sender_id, first 16 hex)
  // CRITICAL: await posthog.shutdown() BEFORE return — prevents event loss (Phase-5-specific pitfall)
  try {
    const posthog = new PostHog(posthogApiKey, {
      host: 'https://app.posthog.com',
      flushAt: 1,
    })
    posthog.capture({
      distinctId: await hashId(senderId),
      event: 'contact_initiated',
      properties: {
        recipient_county_id: elig.recipient_county_id,
        recipient_category_id: elig.recipient_category_id,
        contact_request_id: request.id,
      },
    })
    await posthog.shutdown() // CRITICAL: flush before return (Phase-5 pitfall — T-5-03-09)
  } catch (err) {
    // Don't fail the relay just because analytics dropped
    console.error('[send-contact] posthog failed', {
      code: (err as { name?: string })?.name,
    })
  }

  // Success response — NEVER include recipient_email, recipient name, or other PII (CONT-06, T-5-03-03)
  return json({ ok: true, contact_id: request.id }, 200)
})

// Helper: deterministic JSON response
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper: anonymize sender ID for PostHog (SHA-256 → first 16 hex chars)
async function hashId(id: string): Promise<string> {
  const enc = new TextEncoder().encode(id)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}
