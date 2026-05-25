import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { ActivityDigestEmail } from '@/emails/activity-digest'
import { captureEvent } from '@/lib/analytics'
import {
  getActivityDigestRecipients,
  getActivityDigestDataForProfile,
  recordActivityDigestSent,
  type ActivityDigestData,
} from '@/lib/data/activity-digest'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
import { safeBuildUnsubscribeUrl } from '@/lib/digest-unsubscribe'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const log = createLogger('activity-digest-cron')
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
    const { recipients, error } = await getActivityDigestRecipients()
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

    for (const recipient of recipients) {
      const { data: email, error: emailError } = await admin.rpc('profile_owner_email', {
        p_profile_id: recipient.id,
      })

      if (emailError) {
        log.error('Failed to resolve activity digest recipient email', {
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

      const { data: stats, error: statsError } = await getActivityDigestDataForProfile(recipient.id)
      if (statsError) {
        failed.push(recipient.id)
        continue
      }

      // Skip if absolutely no activity (optional: we could still send a "no activity" email)
      // For now, send to everyone eligible to maintain engagement
      try {
        await resend.emails.send({
          from: 'Barterkin <hello@barterkin.com>',
          to: [email],
          subject: buildSubject(stats, recipient.display_name ?? recipient.username),
          react: ActivityDigestEmail({
            recipientName: recipient.display_name ?? recipient.username,
            messagesCount: stats.messagesCount,
            profileViews: stats.profileViews,
            listingSaves: stats.listingSaves,
            newMembers: stats.newMembers,
            messagesUrl: `${siteUrl}/dashboard/messages`,
            profileUrl: `${siteUrl}/profile/${recipient.username ?? recipient.id}`,
            listingsUrl: `${siteUrl}/listings`,
            directoryUrl: `${siteUrl}/directory`,
            siteUrl,
            unsubscribeUrl: safeBuildUnsubscribeUrl(recipient.id, siteUrl) ?? undefined,
          }),
        })

        const recordResult = await recordActivityDigestSent(recipient.id, stats)
        if (!recordResult.ok) {
          log.error('Failed to record activity digest send after email delivery', {
            error: recordResult.error,
            context: { profile_id: recipient.id },
          })
          failed.push(recipient.id)
          continue
        }

        sent.push(recipient.id)
      } catch (err) {
        log.error('Failed to send activity digest email', {
          error: err,
          context: { profile_id: recipient.id, email },
        })
        failed.push(recipient.id)
      }
    }

    if (sent.length > 0) {
      void captureEvent('system', 'activity_digest_sent', {
        count: sent.length,
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
    log.error('Unexpected error processing activity digest cron', { error: err })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function buildSubject(stats: ActivityDigestData, name: string | null): string {
  const parts: string[] = []
  if (stats.messagesCount > 0) parts.push(`${stats.messagesCount} new message${stats.messagesCount === 1 ? '' : 's'}`)
  if (stats.profileViews > 0) parts.push(`${stats.profileViews} profile view${stats.profileViews === 1 ? '' : 's'}`)

  if (parts.length > 0) {
    return `Your weekly activity: ${parts.join(', ')}`
  }

  return name ? `${name}, your weekly Barterkin digest` : 'Your weekly Barterkin digest'
}
