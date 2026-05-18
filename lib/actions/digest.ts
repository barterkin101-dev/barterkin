/**
 * Digest email server action
 *
 * Sends a personalized weekly digest email to a single member.
 * Includes new listings in their county + unread message count.
 * Idempotent — email_digests table prevents duplicate sends per week.
 */
import 'server-only'
import { Resend } from 'resend'
import { WeeklyDigestEmail } from '@/emails/weekly-digest'
import { captureEvent } from '@/lib/analytics'
import {
  getDigestListingsForProfile,
  getDigestRecipients,
  getUnreadMessageCountForProfile,
  recordDigestSent,
} from '@/lib/data/digest'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
import { buildUnsubscribeUrl } from '@/lib/digest-unsubscribe'

const log = createLogger('digest-action')

export interface SendDigestResult {
  ok: boolean
  sent?: boolean
  error?: string
}

/**
 * Send a weekly digest email to a single profile.
 * Only sends if the profile is eligible (published, digest enabled, not sent this week).
 * Returns { sent: false } if there are no new listings and no unread messages.
 */
export async function sendDigestToProfile(profileId: string): Promise<SendDigestResult> {
  const apiKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  if (!apiKey) {
    log.error('RESEND_API_KEY not configured')
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    // Verify profile is eligible
    const { recipients, error: recipientError } = await getDigestRecipients()
    if (recipientError) {
      return { ok: false, error: recipientError }
    }

    const recipient = recipients.find((r) => r.id === profileId)
    if (!recipient) {
      return { ok: true, sent: false }
    }

    // Fetch data
    const [{ listings, error: listingError }, unreadCount] = await Promise.all([
      getDigestListingsForProfile(profileId),
      getUnreadMessageCountForProfile(profileId),
    ])

    if (listingError) {
      return { ok: false, error: listingError }
    }

    // Skip if nothing to report
    if (listings.length === 0 && unreadCount === 0) {
      return { ok: true, sent: false }
    }

    // Resolve email
    const admin = getSupabaseAdmin()
    const { data: email, error: emailError } = await admin.rpc('profile_owner_email', {
      p_profile_id: profileId,
    })

    if (emailError) {
      log.error('Failed to resolve digest recipient email', {
        error: emailError,
        context: { profile_id: profileId },
      })
      return { ok: false, error: 'email_lookup_failed' }
    }

    if (!email) {
      return { ok: true, sent: false }
    }

    // Build headline
    const countyNames = [...new Set(listings.map((l) => l.county_name).filter(Boolean))]
    const headline =
      countyNames.length === 1
        ? `New listings in ${countyNames[0]} this week`
        : 'New listings near you this week'

    // Send email
    const resend = new Resend(apiKey)
    const unsubscribeUrl = buildUnsubscribeUrl(profileId, siteUrl)
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
        unsubscribeUrl,
      }),
    })

    // Record send
    const recordResult = await recordDigestSent(profileId, listings.length)
    if (!recordResult.ok) {
      log.error('Failed to record digest sent after delivery', {
        error: recordResult.error,
        context: { profile_id: profileId },
      })
    }

    void captureEvent(profileId, 'digest_email_sent', {
      listings_count: listings.length,
      unread_count: unreadCount,
    })

    log.info('Digest email sent', { context: { profile_id: profileId, email, listings: listings.length, unread: unreadCount } })
    return { ok: true, sent: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('Failed to send digest email', { error: err, context: { profile_id: profileId } })
    return { ok: false, error: msg }
  }
}

/**
 * Send weekly digest emails to all eligible recipients.
 * Returns aggregate stats for the batch.
 */
export async function sendWeeklyDigests(): Promise<{
  ok: boolean
  processed: number
  sent: number
  failed: number
  skipped: number
  error?: string
}> {
  const { recipients, error } = await getDigestRecipients()
  if (error) {
    return { ok: false, processed: 0, sent: 0, failed: 0, skipped: 0, error }
  }

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const recipient of recipients) {
    const result = await sendDigestToProfile(recipient.id)
    if (result.ok && result.sent) {
      sent++
    } else if (result.ok && !result.sent) {
      skipped++
    } else {
      failed++
    }
  }

  return { ok: true, processed: recipients.length, sent, failed, skipped }
}
