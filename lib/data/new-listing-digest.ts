/**
 * New listing digest data layer
 *
 * NLD-01: fetch eligible recipients (published, 3+ days inactive, county set)
 * NLD-02: fetch digest listings per profile (county-matched, last 7d, up to 3)
 * NLD-03: track sends (deduplicated to 1 per 3 days)
 */
import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const BATCH_SIZE = 100

export interface NewListingDigestRecipient {
  id: string
  display_name: string | null
  username: string | null
  county_id: number | null
  owner_id: string
  last_login_at: string | null
}

export interface NewListingDigestListing {
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

export async function getNewListingDigestRecipients(): Promise<{
  recipients: NewListingDigestRecipient[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('new-listing-digest')
  const inactiveCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const resendCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, display_name, username, county_id, owner_id, last_login_at')
      .eq('is_published', true)
      .eq('banned', false)
      .eq('email_digest_enabled', true)
      .not('last_login_at', 'is', null)
      .lte('last_login_at', inactiveCutoff)
      .not('county_id', 'is', null)
      .order('last_login_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      log.error('Failed to fetch new listing digest recipients', { error })
      return { recipients: [], error: 'fetch_failed' }
    }

    const rawProfiles = (profiles ?? []) as NewListingDigestRecipient[]
    if (rawProfiles.length === 0) {
      return { recipients: [], error: null }
    }

    const profileIds = rawProfiles.map((p) => p.id)
    const { data: recentSends, error: sendError } = await admin
      .from('new_listing_digest_sends')
      .select('profile_id')
      .in('profile_id', profileIds)
      .gte('sent_at', resendCutoff)

    if (sendError) {
      log.error('Failed to fetch recent new listing digest sends', { error: sendError })
      return { recipients: [], error: 'send_lookup_failed' }
    }

    const recentlySent = new Set((recentSends ?? []).map((row) => row.profile_id))
    return {
      recipients: rawProfiles.filter((p) => !recentlySent.has(p.id)),
      error: null,
    }
  } catch (err) {
    log.error('getNewListingDigestRecipients unexpected error', { error: err })
    return { recipients: [], error: 'unknown' }
  }
}

export async function getNewListingDigestListingsForProfile(
  profileId: string,
): Promise<{ listings: NewListingDigestListing[]; error: string | null }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('new-listing-digest')

  try {
    const { data: rows, error } = await admin.rpc('get_new_listing_digest_listings', {
      p_profile_id: profileId,
    })

    if (error) {
      log.error('get_new_listing_digest_listings error', { error, context: { code: error.code } })
      return { listings: [], error: 'query_failed' }
    }

    return { listings: (rows ?? []) as NewListingDigestListing[], error: null }
  } catch (err) {
    log.error('getNewListingDigestListingsForProfile unexpected error', { error: err })
    return { listings: [], error: 'unknown' }
  }
}

export async function recordNewListingDigestSent(
  profileId: string,
  listingsCount: number,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('new-listing-digest')

  try {
    const { error } = await admin.from('new_listing_digest_sends').insert({
      profile_id: profileId,
      listings_count: listingsCount,
    })

    if (error) {
      if (error.code === '23505') {
        return { ok: true }
      }
      log.error('Failed to record new listing digest send', {
        error,
        context: { profile_id: profileId },
      })
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    log.error('recordNewListingDigestSent unexpected error', { error: err })
    return { ok: false, error: 'unknown' }
  }
}
