/**
 * Contact limit data layer
 *
 * Counts how many distinct conversations a profile has initiated
 * in the last 30 days. Used to show free-tier upsell when near
 * the 10/mo contact cap.
 */
import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const FREE_CONTACT_LIMIT = 10
const PREMIUM_CONTACT_LIMIT = 100
const WARNING_THRESHOLD = 7 // show upsell when 7+ used

export interface ContactLimitStatus {
  used: number
  limit: number
  remaining: number
  isNearLimit: boolean
  isAtLimit: boolean
}

export async function getContactLimitStatus(
  profileId: string,
  tier: string,
): Promise<ContactLimitStatus> {
  const admin = getSupabaseAdmin()
  const log = createLogger('contact-limit')

  const limit = tier === 'premium' || tier === 'founding' ? PREMIUM_CONTACT_LIMIT : FREE_CONTACT_LIMIT

  try {
    // Count distinct conversations touched by this profile in the last 30 days.
    // This aligns with the product copy shown to members: started conversations
    // against the monthly contact cap.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await admin
      .from('messages')
      .select('conversation_id')
      .eq('sender_profile_id', profileId)
      .gte('created_at', thirtyDaysAgo)

    if (error) {
      log.error('getContactLimitStatus count failed', { error, context: { profileId } })
      return { used: 0, limit, remaining: limit, isNearLimit: false, isAtLimit: false }
    }

    const used = new Set((data ?? []).map((row) => row.conversation_id)).size
    const remaining = Math.max(0, limit - used)
    const isNearLimit = tier === 'free' && used >= WARNING_THRESHOLD && used < limit
    const isAtLimit = used >= limit

    return { used, limit, remaining, isNearLimit, isAtLimit }
  } catch (err) {
    log.error('getContactLimitStatus unexpected error', { error: err, context: { profileId } })
    return { used: 0, limit, remaining: limit, isNearLimit: false, isAtLimit: false }
  }
}
