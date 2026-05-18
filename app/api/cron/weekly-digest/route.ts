import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { WeeklyDigestEmail } from '@/emails/weekly-digest'
import { captureEvent } from '@/lib/analytics'
import {
  getDigestListingsForProfile,
  getDigestRecipients,
  getUnreadMessageCountForProfile,
  recordDigestSent,
  type DigestListing,
} from '@/lib/data/digest'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

// Node runtime — resend SDK uses Node APIs.
export const runtime = 'nodejs'

// ============================================================================
// Cron endpoint: weekly "New listings in your county" digest email
// ============================================================================
// Designed to be called by a cron job (Vercel Cron, GitHub Actions, or manual
// invocation). Sends personalized digest emails to active members.
//
// Logic:
//   1. Find eligible members (published, digest enabled, not sent this week)
//   2. For each member, fetch new listings in their county (last 7d)
//   3. Send email if listings exist
//   4. Record sent digest (deduplicated per profile per week)
//
// Auth: expects a secret token in the Authorization header (CRON_SECRET).
// ============================================================================

function buildHeadline(listings: DigestListing[]) {
  const countyNames = [...new Set(listings.map((listing) => listing.county_name).filter(Boolean))]

  if (countyNames.length === 1) {
    return `New listings in ${countyNames[0]} this week`
  }

  return 'New listings near you this week'
}

export async function POST(request: Request) {
  const log = createLogger('weekly-digest')
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  if (!apiKey) {
    log.error('RESEND_API_KEY not configured')
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const resend = new Resend(apiKey)
  const admin = getSupabaseAdmin()

  try {
    const { recipients, error } = await getDigestRecipients()
    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        sent: [],
        failed: [],
        skipped: [],
        reason: 'no_recipients',
      })
    }

    const sent: string[] = []
    const failed: string[] = []
    const skipped: string[] = []
    let totalListingsSent = 0

    for (const recipient of recipients) {
      const { data: email, error: emailError } = await admin.rpc('profile_owner_email', {
        p_profile_id: recipient.id,
      })

      if (emailError) {
        log.error('Failed to resolve digest recipient email', {
          error: emailError,
          context: { profile_id: recipient.id },
        })
        failed.push(recipient.id)
        continue
      }

      if (!email) {
        skipped.push(recipient.id)
        continue
      }

      const { listings, error: listingError } = await getDigestListingsForProfile(recipient.id)
      if (listingError) {
        failed.push(recipient.id)
        continue
      }

      if (listings.length === 0) {
        skipped.push(recipient.id)
        continue
      }

      try {
        const headline = buildHeadline(listings)
        const unreadCount = await getUnreadMessageCountForProfile(recipient.id)
        await resend.emails.send({
          from: 'Barterkin <hello@barterkin.com>',
          to: [email],
          subject: unreadCount > 0 ? `You have ${unreadCount} unread message${unreadCount === 1 ? '' : 's'} — ${headline}` : headline,
          react: WeeklyDigestEmail({
            recipientName: recipient.display_name ?? recipient.username,
            headline,
            listings,
            browseUrl: `${siteUrl}/listings`,
            siteUrl,
            unreadCount,
            messagesUrl: `${siteUrl}/dashboard/messages`,
          }),
        })

        const recordResult = await recordDigestSent(recipient.id, listings.length)
        if (!recordResult.ok) {
          log.error('Failed to record digest send after email delivery', {
            error: recordResult.error,
            context: { profile_id: recipient.id },
          })
          failed.push(recipient.id)
          continue
        }

        totalListingsSent += listings.length
        sent.push(recipient.id)
      } catch (err) {
        log.error('Failed to send weekly digest email', {
          error: err,
          context: { profile_id: recipient.id, email },
        })
        failed.push(recipient.id)
      }
    }

    if (sent.length > 0) {
      void captureEvent('system', 'weekly_digest_sent', {
        count: sent.length,
        listings_total: totalListingsSent,
      })
    }

    return NextResponse.json({
      ok: true,
      processed: recipients.length,
      sent,
      failed,
      skipped,
    })
  } catch (err) {
    log.error('Unexpected error processing weekly digest cron', { error: err })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
