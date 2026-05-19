/**
 * Listing alert email action
 *
 * Sends email alerts to members when new listings match their saved searches.
 * Idempotent — listing_alerts table deduplicates per search per day.
 */
import 'server-only'
import { Resend } from 'resend'
import { ListingAlertEmail } from '@/emails/listing-alert'
import { captureEvent } from '@/lib/analytics'
import {
  getAlertEligibleSearches,
  getNewListingsForSavedSearch,
  recordAlertSent,
  type SavedSearchRow,
} from '@/lib/data/saved-searches'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
import { safeBuildUnsubscribeUrl } from '@/lib/digest-unsubscribe'

const log = createLogger('listing-alerts')

export async function sendListingAlerts(): Promise<{
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
    return { ok: false, sent: 0, failed: 0, skipped: 0, error: 'RESEND_API_KEY not configured' }
  }

  const { searches, error } = await getAlertEligibleSearches()
  if (error) {
    return { ok: false, sent: 0, failed: 0, skipped: 0, error }
  }

  const admin = getSupabaseAdmin()
  const resend = new Resend(apiKey)
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const search of searches) {
    const { listings, error: listingError } = await getNewListingsForSavedSearch(search)
    if (listingError) {
      failed++
      continue
    }

    if (listings.length === 0) {
      skipped++
      continue
    }

    // Resolve email
    const { data: email, error: emailError } = await admin.rpc('profile_owner_email', {
      p_profile_id: search.profile_id,
    })

    if (emailError) {
      log.error('Failed to resolve alert recipient email', {
        error: emailError,
        context: { profile_id: search.profile_id },
      })
      failed++
      continue
    }

    if (!email) {
      skipped++
      continue
    }

    // Resolve display name
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name, username')
      .eq('id', search.profile_id)
      .maybeSingle()

    const recipientName = profile?.display_name ?? profile?.username ?? null

    const headline =
      listings.length === 1
        ? '1 new listing matches your search'
        : `${listings.length} new listings match your search`

    const unsubscribeUrl = safeBuildUnsubscribeUrl(search.profile_id, siteUrl)

    try {
      await resend.emails.send({
        from: 'Barterkin <hello@barterkin.com>',
        to: [email],
        subject: headline,
        react: ListingAlertEmail({
          recipientName,
          headline,
          listings,
          browseUrl: `${siteUrl}/directory`,
          siteUrl,
          unsubscribeUrl,
        }),
      })

      const recordResult = await recordAlertSent(search.id, search.profile_id, listings.length)
      if (!recordResult.ok) {
        log.error('Failed to record alert sent after delivery', {
          error: recordResult.error,
          context: { saved_search_id: search.id },
        })
      }

      void captureEvent(search.profile_id, 'listing_alert_sent', {
        saved_search_id: search.id,
        listings_count: listings.length,
      })

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('Failed to send listing alert', {
        error: err,
        context: { saved_search_id: search.id, profile_id: search.profile_id, email },
      })
      failed++
    }
  }

  if (sent > 0) {
    void captureEvent('system', 'listing_alert_batch_complete', { sent, failed, skipped })
  }

  return { ok: true, sent, failed, skipped }
}
