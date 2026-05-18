/**
 * Weekly digest data layer
 *
 * DIGEST-01: fetch eligible recipients (published profiles with digest enabled)
 * DIGEST-02: fetch digest listings per profile (county-matched, last 7d)
 * DIGEST-03: track sent digests (deduplicated per profile per week)
 */
import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { ListingRow } from '@/lib/data/listings.types'

const BATCH_SIZE = 100
const DIGEST_LISTING_LIMIT = 10

export interface DigestRecipient {
  id: string
  display_name: string | null
  username: string | null
  county_id: number | null
  owner_id: string
}

export interface DigestListing {
  id: string
  profile_id: string
  title: string
  description: string
  category_id: number | null
  county_id: number | null
  condition: string | null
  trade_terms: string | null
  price_estimate: string | null
  created_at: string
  seller_display_name: string | null
  seller_username: string | null
  seller_avatar_url: string | null
  category_name: string | null
  county_name: string | null
}

export interface DigestResult {
  listings: DigestListing[]
  error: string | null
}

/**
 * Fetch profiles eligible for the weekly digest:
 * - is_published = true
 * - email_digest_enabled = true
 * - Not already sent a digest this week
 * - Has a valid email (resolved via RPC)
 */
export async function getDigestRecipients(): Promise<{
  recipients: DigestRecipient[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('digest')

  try {
    // Find profiles eligible for digest who haven't received one this week
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, display_name, username, county_id, owner_id')
      .eq('is_published', true)
      .eq('email_digest_enabled', true)
      .eq('banned', false)
      .limit(BATCH_SIZE)

    if (error) {
      log.error('Failed to fetch digest recipients', { error })
      return { recipients: [], error: 'fetch_failed' }
    }

    const rawProfiles = (profiles ?? []) as DigestRecipient[]

    // Filter out profiles who already got a digest this week
    const profileIds = rawProfiles.map((p) => p.id)
    if (profileIds.length === 0) {
      return { recipients: [], error: null }
    }

    const { data: recentDigests } = await admin
      .from('email_digests')
      .select('profile_id')
      .in('profile_id', profileIds)
      .eq('digest_type', 'weekly_listings')
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const sentThisWeek = new Set((recentDigests ?? []).map((d) => d.profile_id))
    const recipients = rawProfiles.filter((p) => !sentThisWeek.has(p.id))

    return { recipients, error: null }
  } catch (err) {
    log.error('getDigestRecipients unexpected error', { error: err })
    return { recipients: [], error: 'unknown' }
  }
}

/**
 * Fetch up to 10 new listings in the last 7 days for a given profile.
 * Uses the SQL function for county-matching and recency filtering.
 */
export async function getDigestListingsForProfile(profileId: string): Promise<DigestResult> {
  const admin = getSupabaseAdmin()
  const log = createLogger('digest')

  try {
    const { data: rows, error } = await admin.rpc('get_weekly_digest_listings', {
      p_profile_id: profileId,
    })

    if (error) {
      log.error('get_weekly_digest_listings error', { error, context: { code: error.code } })
      return { listings: [], error: 'query_failed' }
    }

    const listings = (rows ?? []) as DigestListing[]
    return { listings, error: null }
  } catch (err) {
    log.error('getDigestListingsForProfile unexpected error', { error: err })
    return { listings: [], error: 'unknown' }
  }
}

/**
 * Record that a digest was sent to a profile.
 * The unique index prevents duplicate sends per week.
 */
export async function recordDigestSent(
  profileId: string,
  listingsCount: number,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('digest')

  try {
    const { error } = await admin.from('email_digests').insert({
      profile_id: profileId,
      digest_type: 'weekly_listings',
      listings_count: listingsCount,
    })

    if (error) {
      // Unique violation = already sent this week, treat as non-error
      if (error.code === '23505') {
        return { ok: true }
      }
      log.error('Failed to record digest', { error, context: { profile_id: profileId } })
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    log.error('recordDigestSent unexpected error', { error: err })
    return { ok: false, error: 'unknown' }
  }
}

/**
 * Count unread messages for a profile across all their conversations.
 * Uses the admin client to bypass RLS.
 */
export async function getUnreadMessageCountForProfile(profileId: string): Promise<number> {
  const admin = getSupabaseAdmin()
  const log = createLogger('digest')

  try {
    // Get all conversations this profile participates in
    const { data: participantRows, error: partErr } = await admin
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('profile_id', profileId)

    if (partErr) {
      log.error('getUnreadMessageCount: failed to fetch participant rows', {
        error: partErr,
        context: { profile_id: profileId },
      })
      return 0
    }

    const conversations = participantRows ?? []
    if (conversations.length === 0) return 0

    let totalUnread = 0

    for (const conv of conversations) {
      const { data: messages, error: msgErr } = await admin
        .from('messages')
        .select('id, sender_profile_id, created_at')
        .eq('conversation_id', conv.conversation_id)
        .neq('sender_profile_id', profileId)

      if (msgErr) {
        log.warn('getUnreadMessageCount: failed to fetch messages', {
          error: msgErr,
          context: { conversation_id: conv.conversation_id },
        })
        continue
      }

      const unreadInConv = (messages ?? []).filter((m) => {
        if (!conv.last_read_at) return true
        return new Date(m.created_at) > new Date(conv.last_read_at)
      }).length

      totalUnread += unreadInConv
    }

    return totalUnread
  } catch (err) {
    log.error('getUnreadMessageCountForProfile unexpected error', { error: err, context: { profile_id: profileId } })
    return 0
  }
}

