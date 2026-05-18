/**
 * Listing save notification email action
 *
 * Sends email notifications to sellers when someone saves their listing.
 * Idempotent — queue table deduplicates per listing per day.
 */
import 'server-only'
import { Resend } from 'resend'
import { ListingSavedEmail } from '@/emails/listing-saved'
import { captureEvent } from '@/lib/analytics'
import {
  getPendingListingSaveNotifications,
  recordListingSaveNotificationSent,
  recordListingSaveNotificationFailed,
} from '@/lib/data/listing-save-notifications'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('listing-save-notifications')

export async function sendListingSaveNotifications(): Promise<{
  ok: boolean
  sent: number
  failed: number
  skipped: number
  error?: string
}> {
  const apiKey = process.env.RESEND_API_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  if (!apiKey) {
    log.error('RESEND_API_KEY not configured')
    return { ok: false, sent: 0, failed: 0, skipped: 0, error: 'resend_not_configured' }
  }

  const { notifications, error: recipientError } = await getPendingListingSaveNotifications()

  if (recipientError) {
    return { ok: false, sent: 0, failed: 0, skipped: 0, error: recipientError }
  }

  if (notifications.length === 0) {
    return { ok: true, sent: 0, failed: 0, skipped: 0 }
  }

  const admin = getSupabaseAdmin()
  const resend = new Resend(apiKey)

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const item of notifications) {
    const { data: email, error: emailError } = await admin.rpc('profile_owner_email', {
      p_profile_id: item.seller.id,
    })

    if (emailError) {
      log.error('Failed to resolve seller email', {
        error: emailError,
        context: { seller_profile_id: item.seller.id },
      })
      await recordListingSaveNotificationFailed(
        item.notification.id,
        'Failed to resolve seller email',
      )
      failed++
      continue
    }

    if (!email) {
      await recordListingSaveNotificationFailed(
        item.notification.id,
        'No email found for seller',
      )
      skipped++
      continue
    }

    try {
      await resend.emails.send({
        from: 'Barterkin <hello@barterkin.com>',
        to: [email],
        subject: `Someone saved your listing "${item.listing.title}" on Barterkin`,
        react: ListingSavedEmail({
          sellerName: item.seller.display_name ?? item.seller.username,
          saverName: item.saver.display_name,
          saverUsername: item.saver.username,
          listingTitle: item.listing.title,
          listingUrl: `${siteUrl}/listings/${item.listing.id}`,
          siteUrl,
        }),
      })

      const recordResult = await recordListingSaveNotificationSent(item.notification.id)
      if (!recordResult.ok) {
        log.error('Failed to record listing save notification sent after delivery', {
          error: recordResult.error,
          context: { notification_id: item.notification.id },
        })
        failed++
        continue
      }

      void captureEvent(item.seller.owner_id, 'listing_save_notification_sent', {
        listing_id: item.listing.id,
        saver_profile_id: item.saver.id,
        method: 'resend',
      })

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('Failed to send listing save notification', {
        error: err,
        context: {
          notification_id: item.notification.id,
          seller_profile_id: item.seller.id,
          email,
        },
      })
      await recordListingSaveNotificationFailed(item.notification.id, msg)
      failed++
    }
  }

  if (sent > 0) {
    void captureEvent('system', 'listing_save_notification_batch_complete', {
      sent,
      failed,
      skipped,
    })
  }

  return { ok: true, sent, failed, skipped }
}
