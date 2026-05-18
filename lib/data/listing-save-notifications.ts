/**
 * Listing save notification data layer
 *
 * LISTING-SAVE-01: fetch pending listing save notifications
 * LISTING-SAVE-02: record send status
 */
import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const BATCH_SIZE = 100

export interface ListingSaveNotification {
  id: string
  saved_listing_id: string
  listing_id: string
  saver_profile_id: string
  seller_profile_id: string
  created_at: string
}

export interface ListingSaveNotificationRecipient {
  notification: ListingSaveNotification
  seller: {
    id: string
    display_name: string | null
    username: string | null
    owner_id: string
  }
  listing: {
    id: string
    title: string
  }
  saver: {
    id: string
    display_name: string | null
    username: string | null
  }
}

export async function getPendingListingSaveNotifications(): Promise<{
  notifications: ListingSaveNotificationRecipient[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('listing-save-notifications')

  try {
    const { data: pending, error } = await admin
      .from('listing_save_email_notifications')
      .select('id, saved_listing_id, listing_id, saver_profile_id, seller_profile_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      log.error('Failed to fetch pending listing save notifications', { error })
      return { notifications: [], error: 'fetch_failed' }
    }

    if (!pending || pending.length === 0) {
      return { notifications: [], error: null }
    }

    // Fetch seller profiles
    const sellerIds = [...new Set(pending.map((n) => n.seller_profile_id))]
    const { data: sellers, error: sellersError } = await admin
      .from('profiles')
      .select('id, display_name, username, owner_id')
      .in('id', sellerIds)

    if (sellersError) {
      log.error('Failed to fetch seller profiles', { error: sellersError })
      return { notifications: [], error: 'fetch_failed' }
    }

    const sellerMap = new Map(sellers?.map((s) => [s.id, s]) ?? [])

    // Fetch listing titles
    const listingIds = [...new Set(pending.map((n) => n.listing_id))]
    const { data: listings, error: listingsError } = await admin
      .from('listings')
      .select('id, title')
      .in('id', listingIds)

    if (listingsError) {
      log.error('Failed to fetch listings', { error: listingsError })
      return { notifications: [], error: 'fetch_failed' }
    }

    const listingMap = new Map(listings?.map((l) => [l.id, l]) ?? [])

    // Fetch saver profiles
    const saverIds = [...new Set(pending.map((n) => n.saver_profile_id))]
    const { data: savers, error: saversError } = await admin
      .from('profiles')
      .select('id, display_name, username')
      .in('id', saverIds)

    if (saversError) {
      log.error('Failed to fetch saver profiles', { error: saversError })
      return { notifications: [], error: 'fetch_failed' }
    }

    const saverMap = new Map(savers?.map((s) => [s.id, s]) ?? [])

    const notifications: ListingSaveNotificationRecipient[] = pending.map((n) => {
      const seller = sellerMap.get(n.seller_profile_id)
      const listing = listingMap.get(n.listing_id)
      const saver = saverMap.get(n.saver_profile_id)

      return {
        notification: n,
        seller: seller ?? { id: n.seller_profile_id, display_name: null, username: null, owner_id: '' },
        listing: listing ?? { id: n.listing_id, title: 'Your listing' },
        saver: saver ?? { id: n.saver_profile_id, display_name: null, username: null },
      }
    })

    return { notifications, error: null }
  } catch (err) {
    log.error('getPendingListingSaveNotifications unexpected error', { error: err })
    return { notifications: [], error: 'unknown' }
  }
}

export async function recordListingSaveNotificationSent(
  notificationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('listing-save-notifications')

  try {
    const { error } = await admin
      .from('listing_save_email_notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) {
      log.error('Failed to record listing save notification sent', {
        error,
        context: { notification_id: notificationId },
      })
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    log.error('recordListingSaveNotificationSent unexpected error', {
      error: err,
      context: { notification_id: notificationId },
    })
    return { ok: false, error: 'unknown' }
  }
}

export async function recordListingSaveNotificationFailed(
  notificationId: string,
  errorMessage: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('listing-save-notifications')

  try {
    const { error } = await admin
      .from('listing_save_email_notifications')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', notificationId)

    if (error) {
      log.error('Failed to record listing save notification failed', {
        error,
        context: { notification_id: notificationId },
      })
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    log.error('recordListingSaveNotificationFailed unexpected error', {
      error: err,
      context: { notification_id: notificationId },
    })
    return { ok: false, error: 'unknown' }
  }
}
