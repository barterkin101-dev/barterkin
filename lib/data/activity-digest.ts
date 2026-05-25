/**
 * Activity digest data layer
 *
 * ACT-01: fetch eligible recipients (published, digest enabled, active recently)
 * ACT-02: fetch activity stats per profile (messages, views, saves, new members)
 * ACT-03: track sends (deduplicated to 1 per week)
 */
import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const BATCH_SIZE = 100

export interface ActivityDigestRecipient {
  id: string
  display_name: string | null
  username: string | null
  county_id: number | null
  owner_id: string
}

export interface ActivityDigestData {
  messagesCount: number
  profileViews: number
  listingSaves: number
  newMembers: number
}

export async function getActivityDigestRecipients(): Promise<{
  recipients: ActivityDigestRecipient[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('activity-digest')

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
      log.error('Failed to fetch activity digest recipients', { error })
      return { recipients: [], error: 'fetch_failed' }
    }

    const rawProfiles = (profiles ?? []) as ActivityDigestRecipient[]

    // Filter out profiles who already got a digest this week
    const profileIds = rawProfiles.map((p) => p.id)
    if (profileIds.length === 0) {
      return { recipients: [], error: null }
    }

    const { data: recentDigests } = await admin
      .from('activity_digest_sends' as any)
      .select('profile_id')
      .in('profile_id', profileIds)
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const sentThisWeek = new Set(((recentDigests as any) ?? []).map((d: any) => d.profile_id))
    const recipients = rawProfiles.filter((p) => !sentThisWeek.has(p.id))

    return { recipients, error: null }
  } catch (err) {
    log.error('getActivityDigestRecipients unexpected error', { error: err })
    return { recipients: [], error: 'unknown' }
  }
}

export async function getActivityDigestDataForProfile(
  profileId: string,
): Promise<{ data: ActivityDigestData; error: string | null }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('activity-digest')

  try {
    const { data: rows, error } = await (admin.rpc as any)('get_activity_digest_data', {
      p_profile_id: profileId,
    })

    if (error) {
      log.error('get_activity_digest_data error', { error, context: { code: error.code } })
      return { data: { messagesCount: 0, profileViews: 0, listingSaves: 0, newMembers: 0 }, error: 'query_failed' }
    }

    const row = (rows ?? [])[0] as
      | { messages_count: number; profile_views: number; listing_saves: number; new_members: number }
      | undefined

    return {
      data: {
        messagesCount: Number(row?.messages_count ?? 0),
        profileViews: Number(row?.profile_views ?? 0),
        listingSaves: Number(row?.listing_saves ?? 0),
        newMembers: Number(row?.new_members ?? 0),
      },
      error: null,
    }
  } catch (err) {
    log.error('getActivityDigestDataForProfile unexpected error', { error: err })
    return { data: { messagesCount: 0, profileViews: 0, listingSaves: 0, newMembers: 0 }, error: 'unknown' }
  }
}

export async function recordActivityDigestSent(
  profileId: string,
  stats: ActivityDigestData,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('activity-digest')

  try {
    const { error } = await (admin.from('activity_digest_sends' as any).insert({
      profile_id: profileId,
      messages_count: stats.messagesCount,
      profile_views: stats.profileViews,
      listing_saves: stats.listingSaves,
      new_members: stats.newMembers,
    }) as any)

    if (error) {
      // Unique violation = already sent this week, treat as non-error
      if (error.code === '23505') {
        return { ok: true }
      }
      log.error('Failed to record activity digest', { error, context: { profile_id: profileId } })
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    log.error('recordActivityDigestSent unexpected error', { error: err })
    return { ok: false, error: 'unknown' }
  }
}
