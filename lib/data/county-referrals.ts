/**
 * County referral unlocks data layer
 *
 * CR-01: fetch county referral stats for a profile (count + unlocked status)
 * CR-02: check and award county unlock (idempotent)
 * CR-03: fetch pending unlocks for cron (inviters with 2+ county referrals not yet unlocked)
 */
import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

export interface CountyReferralStats {
  countyId: number
  countyName: string
  referralCount: number
  unlocked: boolean
  creditsAwarded: number
}

export async function getCountyReferralStats(profileId: string): Promise<{
  stats: CountyReferralStats[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('county-referrals')

  try {
    // Get the profile's county
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('county_id')
      .eq('id', profileId)
      .maybeSingle()

    if (profileErr) {
      log.error('Failed to fetch profile county', { error: profileErr })
      return { stats: [], error: 'profile_fetch_failed' }
    }

    if (!profile?.county_id) {
      return { stats: [], error: null }
    }

    const countyId = profile.county_id

    // Get county name
    const { data: countyRow, error: countyErr } = await admin
      .from('counties')
      .select('name')
      .eq('id', countyId)
      .maybeSingle()

    if (countyErr) {
      log.error('Failed to fetch county name', { error: countyErr })
      return { stats: [], error: 'county_fetch_failed' }
    }

    const countyName = countyRow?.name ?? 'your county'

    // Count published referrals from this county
    const { data: countResult, error: countErr } = await admin.rpc('count_county_referrals', {
      p_inviter_id: profileId,
      p_county_id: countyId,
    })

    if (countErr) {
      log.error('count_county_referrals error', { error: countErr })
      return { stats: [], error: 'count_failed' }
    }

    const referralCount = countResult ?? 0

    // Check unlock status
    const { data: unlockRow, error: unlockErr } = await admin
      .from('county_referral_unlocks')
      .select('unlocked_at, credits_awarded')
      .eq('inviter_id', profileId)
      .eq('county_id', countyId)
      .maybeSingle()

    if (unlockErr) {
      log.error('Failed to fetch unlock status', { error: unlockErr })
      return { stats: [], error: 'unlock_fetch_failed' }
    }

    const unlocked = !!unlockRow?.unlocked_at
    const creditsAwarded = unlockRow?.credits_awarded ?? 0

    return {
      stats: [{ countyId, countyName, referralCount, unlocked, creditsAwarded }],
      error: null,
    }
  } catch (err) {
    log.error('getCountyReferralStats unexpected error', { error: err })
    return { stats: [], error: 'unknown' }
  }
}

export async function checkAndAwardCountyUnlock(
  profileId: string,
  countyId: number,
): Promise<{
  wasUnlocked: boolean
  referralCount: number
  creditsAwarded: number
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('county-referrals')

  try {
    const { data: rows, error } = await admin.rpc('check_and_award_county_unlock', {
      p_inviter_id: profileId,
      p_county_id: countyId,
    })

    if (error) {
      log.error('check_and_award_county_unlock error', { error, context: { code: error.code } })
      return { wasUnlocked: false, referralCount: 0, creditsAwarded: 0, error: 'rpc_failed' }
    }

    const result = (rows as Array<{ was_unlocked: boolean; referral_count: number; credits_awarded: number }> | null)?.[0]

    return {
      wasUnlocked: result?.was_unlocked ?? false,
      referralCount: result?.referral_count ?? 0,
      creditsAwarded: result?.credits_awarded ?? 0,
      error: null,
    }
  } catch (err) {
    log.error('checkAndAwardCountyUnlock unexpected error', { error: err })
    return { wasUnlocked: false, referralCount: 0, creditsAwarded: 0, error: 'unknown' }
  }
}

export interface PendingCountyUnlock {
  inviterId: string
  countyId: number
  countyName: string
  referralCount: number
  displayName: string | null
  username: string | null
}

export async function getPendingCountyUnlocks(): Promise<{
  unlocks: PendingCountyUnlock[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('county-referrals')

  try {
    // Find inviters with 2+ published referrals from a county who haven't unlocked yet
    const { data: rows, error } = await admin.rpc('get_pending_county_unlocks')

    if (error) {
      log.error('get_pending_county_unlocks error', { error, context: { code: error.code } })
      return { unlocks: [], error: 'rpc_failed' }
    }

    const unlocks = (rows ?? []) as PendingCountyUnlock[]
    return { unlocks, error: null }
  } catch (err) {
    log.error('getPendingCountyUnlocks unexpected error', { error: err })
    return { unlocks: [], error: 'unknown' }
  }
}
