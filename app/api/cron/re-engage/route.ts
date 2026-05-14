import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { ReEngagementEmail } from '@/emails/re-engagement'
import { captureEvent } from '@/lib/analytics'
import {
  getDormantRecipients,
  getReEngagementListingsForProfile,
  recordReEngagementSent,
} from '@/lib/data/re-engagement'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const log = createLogger('re-engage-cron')
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

  try {
    const admin = getSupabaseAdmin()
    const { recipients, error } = await getDormantRecipients()
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
        log.error('Failed to resolve re-engagement recipient email', {
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

      const { listings, error: listingError } = await getReEngagementListingsForProfile(recipient.id)
      if (listingError) {
        failed.push(recipient.id)
        continue
      }

      if (listings.length === 0) {
        skipped.push(recipient.id)
        continue
      }

      try {
        await resend.emails.send({
          from: 'Barterkin <hello@barterkin.com>',
          to: [email],
          subject: `We miss you - ${listings.length} new ${listings.length === 1 ? 'listing' : 'listings'} near you`,
          react: ReEngagementEmail({
            recipientName: recipient.display_name ?? recipient.username,
            listings,
            browseUrl: `${siteUrl}/listings`,
            loginUrl: `${siteUrl}/login`,
            siteUrl,
          }),
        })

        const recordResult = await recordReEngagementSent(recipient.id, listings.length)
        if (!recordResult.ok) {
          log.error('Failed to record re-engagement send after email delivery', {
            error: recordResult.error,
            context: { profile_id: recipient.id },
          })
          failed.push(recipient.id)
          continue
        }

        totalListingsSent += listings.length
        sent.push(recipient.id)
      } catch (err) {
        log.error('Failed to send re-engagement email', {
          error: err,
          context: { profile_id: recipient.id, email },
        })
        failed.push(recipient.id)
      }
    }

    if (sent.length > 0) {
      void captureEvent('system', 're_engagement_sent', {
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
    log.error('Unexpected error processing re-engagement cron', { error: err })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
