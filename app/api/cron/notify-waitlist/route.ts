import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import { STRIPE_FOUNDING_MEMBER_LIMIT } from '@/lib/stripe/config'

// Node runtime — resend SDK uses Node APIs.
export const runtime = 'nodejs'

// ============================================================================
// Cron endpoint: notify waitlist about founding member slot availability
// ============================================================================
// Designed to be called by a cron job (Vercel Cron, GitHub Actions, or manual
// invocation). Emails waitlisters when founding slots are available.
//
// Logic:
//   1. Check if founding slots are available (> 0 remaining)
//   2. Find waitlisters who haven't been notified about founding
//   3. Send personalized email with direct link to claim founding slot
//   4. Mark waitlisters as notified
//
// Auth: expects a secret token in the Authorization header (CRON_SECRET).
// ============================================================================

const BATCH_SIZE = 100
const MIN_SLOTS_TO_NOTIFY = 1 // Notify when at least 1 slot is available

export async function POST(request: Request) {
  const log = createLogger('waitlist-notify')

  // ── Auth guard ──
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Resend setup ──
  const apiKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'
  if (!apiKey) {
    log.error('RESEND_API_KEY not configured')
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const resend = new Resend(apiKey)
  const admin = getSupabaseAdmin()

  try {
    // ── Check founding slot availability ──
    const { count: foundingCount, error: countErr } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tier', 'founding')

    if (countErr) {
      log.error('Failed to count founding members', { error: countErr })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const slotsRemaining = Math.max(0, STRIPE_FOUNDING_MEMBER_LIMIT - (foundingCount ?? 0))

    if (slotsRemaining < MIN_SLOTS_TO_NOTIFY) {
      log.info('No founding slots available, skipping notification', {
        context: { slots_remaining: slotsRemaining },
      })
      return NextResponse.json({
        ok: true,
        notified: 0,
        reason: 'no_slots_available',
        slots_remaining: slotsRemaining,
      })
    }

    // ── Find unnotified waitlisters ──
    const { data: waitlisters, error: fetchErr } = await admin
      .from('waitlist')
      .select('id, email, county_id')
      .eq('notified_about_founding', false)
      .is('converted_user_id', null) // Only notify people who haven't signed up yet
      .order('joined_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchErr) {
      log.error('Failed to fetch waitlisters', { error: fetchErr })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!waitlisters || waitlisters.length === 0) {
      return NextResponse.json({
        ok: true,
        notified: 0,
        reason: 'no_waitlisters',
        slots_remaining: slotsRemaining,
      })
    }

    // ── Send emails ──
    const sent: string[] = []
    const failed: string[] = []

    for (const waitlister of waitlisters) {
      try {
        await resend.emails.send({
          from: 'Barterkin <hello@barterkin.com>',
          to: [waitlister.email],
          subject: `${slotsRemaining} founding member ${slotsRemaining === 1 ? 'slot' : 'slots'} left — claim yours now`,
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Founding member slots are open</title>
</head>
<body style="margin:0;padding:32px 16px;background:#eef3e8;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#f4f7f0;border-radius:8px;overflow:hidden;border:1px solid #dfe8d5;">
    <div style="background:#2d5a27;padding:24px 32px;">
      <h1 style="color:#eef3e8;font-family:Lora,Georgia,serif;font-size:22px;margin:0;">Barterkin</h1>
      <p style="color:#eef3e8;font-size:13px;margin:4px 0 0 0;">Georgia Barter Network</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e4420;font-family:Lora,Georgia,serif;font-size:22px;margin-bottom:16px;">Founding member slots are open</h2>
      <p style="color:#1e4420;font-size:15px;line-height:1.6;margin-bottom:24px;">
        You joined the Barterkin waitlist early — now it's your turn. <strong>${slotsRemaining} founding member ${slotsRemaining === 1 ? 'slot' : 'slots'}</strong> ${slotsRemaining === 1 ? 'is' : 'are'} still available.
      </p>
      <p style="color:#1e4420;font-size:15px;line-height:1.6;margin-bottom:24px;">
        Founding members get Premium forever at <strong>$5/month</strong> (locked-in price, even when Premium goes to $9). Plus an exclusive badge on your profile.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${siteUrl}/signup?founding=1" style="display:inline-block;background:#c4956a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Claim your founding slot</a>
      </div>
      <p style="color:#1e4420;font-size:14px;line-height:1.6;margin-bottom:24px;">
        First come, first served. Once these slots are gone, only the regular $9/month Premium plan will be available.
      </p>
      <hr style="border-color:#dfe8d5;margin:32px 0 16px 0;">
      <p style="color:#3a7032;font-size:12px;line-height:1.5;margin:0;">
        Georgia Barter Network · <a href="${siteUrl}" style="color:#c4956a;">${siteUrl.replace(/^https?:\/\//, '')}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
        })

        // Mark as notified
        const { error: updateErr } = await admin
          .from('waitlist')
          .update({
            notified_about_founding: true,
            notified_at: new Date().toISOString(),
          })
          .eq('id', waitlister.id)

        if (updateErr) {
          log.error('Failed to mark waitlister as notified', {
            error: updateErr,
            context: { waitlist_id: waitlister.id },
          })
          failed.push(waitlister.id)
        } else {
          sent.push(waitlister.id)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log.error('Failed to send waitlist email', {
          error: msg,
          context: { waitlist_id: waitlister.id, email: waitlister.email },
        })
        failed.push(waitlister.id)
      }
    }

    // Track event
    if (sent.length > 0) {
      void captureEvent('waitlist_founding_notified', {
        count: sent.length,
        slots_remaining: slotsRemaining,
      })
    }

    log.info('Waitlist notification batch complete', {
      context: {
        slots_remaining: slotsRemaining,
        processed: waitlisters.length,
        sent: sent.length,
        failed: failed.length,
      },
    })

    return NextResponse.json({
      ok: true,
      slots_remaining: slotsRemaining,
      processed: waitlisters.length,
      sent,
      failed,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('Unexpected error processing waitlist notifications', { error: msg })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
