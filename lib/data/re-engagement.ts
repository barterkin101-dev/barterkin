/**
 * Dormant member re-engagement data layer
 *
 * REENGAGE-01: fetch eligible dormant profiles (14+ days inactive, opted in)
 * REENGAGE-02: fetch new county-matched listings since their last login
 * REENGAGE-03: track sends (deduplicated to 1 per 7 days)
 */
import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const BATCH_SIZE = 100

export interface ReEngagementRecipient {
  id: string
  display_name: string | null
  username: string | null
  county_id: number | null
  owner_id: string
  last_login_at: string | null
}

export interface ReEngagementListing {
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

export async function getDormantRecipients(): Promise<{
  recipients: ReEngagementRecipient[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('re-engagement')
  const dormantCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const resendCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, display_name, username, county_id, owner_id, last_login_at')
      .eq('banned', false)
      .eq('email_digest_enabled', true)
      .not('last_login_at', 'is', null)
      .lte('last_login_at', dormantCutoff)
      .order('last_login_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      log.error('Failed to fetch dormant recipients', { error })
      return { recipients: [], error: 'fetch_failed' }
    }

    const rawProfiles = (profiles ?? []) as ReEngagementRecipient[]
    if (rawProfiles.length === 0) {
      return { recipients: [], error: null }
    }

    const profileIds = rawProfiles.map((profile) => profile.id)
    const { data: recentSends, error: sendError } = await admin
      .from('re_engagement_sends')
      .select('profile_id')
      .in('profile_id', profileIds)
      .gte('sent_at', resendCutoff)

    if (sendError) {
      log.error('Failed to fetch recent re-engagement sends', { error: sendError })
      return { recipients: [], error: 'send_lookup_failed' }
    }

    const recentlySent = new Set((recentSends ?? []).map((row) => row.profile_id))
    return {
      recipients: rawProfiles.filter((profile) => !recentlySent.has(profile.id)),
      error: null,
    }
  } catch (err) {
    log.error('getDormantRecipients unexpected error', { error: err })
    return { recipients: [], error: 'unknown' }
  }
}

export async function getReEngagementListingsForProfile(profileId: string): Promise<{
  listings: ReEngagementListing[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('re-engagement')

  try {
    const { data: rows, error } = await admin.rpc('get_re_engagement_listings', {
      p_profile_id: profileId,
    })

    if (error) {
      log.error('get_re_engagement_listings error', { error, context: { code: error.code } })
      return { listings: [], error: 'query_failed' }
    }

    return { listings: (rows ?? []) as ReEngagementListing[], error: null }
  } catch (err) {
    log.error('getReEngagementListingsForProfile unexpected error', { error: err })
    return { listings: [], error: 'unknown' }
  }
}

export async function recordReEngagementSent(
  profileId: string,
  listingsCount: number,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('re-engagement')

  try {
    const { error } = await admin.from('re_engagement_sends').insert({
      profile_id: profileId,
      listings_count: listingsCount,
    })

    if (error) {
      if (error.code === '23505') {
        return { ok: true }
      }

      log.error('Failed to record re-engagement send', {
        error,
        context: { profile_id: profileId },
      })
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    log.error('recordReEngagementSent unexpected error', { error: err })
    return { ok: false, error: 'unknown' }
  }
}
