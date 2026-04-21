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

// Rate caps are now enforced atomically inside the send_contact_gated SQL RPC (H-01 fix).
// The values are documented there: daily=5, weekly=20, per-pair-weekly=2.

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

  // Rate limit checks + insert — atomic via send_contact_gated RPC (H-01 fix)
  // The RPC acquires pg_advisory_xact_lock(sender) so concurrent requests from the same
  // sender are serialized; caps and insert happen inside one transaction.
  const { data: gatedId, error: gatedErr } = await supabase
    .rpc('send_contact_gated', {
      p_sender_profile_id: elig.sender_profile_id,
      p_recipient_profile_id: recipientProfileId,
      p_message: message,
    })

  if (gatedErr || !gatedId) {
    // Map raised exceptions to structured error codes
    const msg = gatedErr?.message ?? ''
    if (msg.includes('daily_cap')) {
      return json(
        {
          code: 'daily_cap',
          error: "You've reached your daily contact limit. You can send more messages tomorrow.",
        },
        429,
      )
    }
    if (msg.includes('weekly_cap')) {
      return json(
        { code: 'weekly_cap', error: "You've reached your weekly contact limit." },
        429,
      )
    }
    if (msg.includes('pair_cap')) {
      return json(
        {
          code: 'pair_cap',
          error: `You've already contacted ${elig.recipient_display_name} this week.`,
        },
        429,
      )
    }
    // 23505 = unique_violation (pair_day partial unique index — same UTC day duplicate)
    if (gatedErr?.code === '23505') {
      return json(
        {
          code: 'pair_dup',
          error: `You've already contacted ${elig.recipient_display_name} today.`,
        },
        429,
      )
    }
    console.error('[send-contact] send_contact_gated failed', { code: gatedErr?.code, msg })
    return json({ code: 'unknown', error: 'Something went wrong.' }, 500)
  }

  const request = { id: gatedId as string }

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
