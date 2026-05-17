/**
 * Onboarding abandonment drip data layer
 *
 * ONBOARDING-DRIP-01: fetch eligible incomplete profiles (signed up 24h+ ago, never completed)
 * ONBOARDING-DRIP-02: track sends to prevent duplicates (max 1 per member)
 */
import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const BATCH_SIZE = 100

export interface OnboardingAbandonmentRecipient {
  id: string
  display_name: string | null
  username: string | null
  owner_id: string
  created_at: string
}

export async function getOnboardingAbandonmentRecipients(): Promise<{
  recipients: OnboardingAbandonmentRecipient[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('onboarding-abandonment')
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, display_name, username, owner_id, created_at')
      .eq('banned', false)
      .is('onboarding_completed_at', null)
      .is('onboarding_reminder_sent_at', null)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      log.error('Failed to fetch onboarding abandonment recipients', { error })
      return { recipients: [], error: 'fetch_failed' }
    }

    return { recipients: (profiles ?? []) as OnboardingAbandonmentRecipient[], error: null }
  } catch (err) {
    log.error('getOnboardingAbandonmentRecipients unexpected error', { error: err })
    return { recipients: [], error: 'unknown' }
  }
}

export async function recordOnboardingReminderSent(profileId: string): Promise<{
  ok: boolean
  error?: string
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('onboarding-abandonment')

  try {
    const { error } = await admin
      .from('profiles')
      .update({ onboarding_reminder_sent_at: new Date().toISOString() })
      .eq('id', profileId)

    if (error) {
      log.error('Failed to record onboarding reminder sent', {
        error,
        context: { profile_id: profileId },
      })
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    log.error('recordOnboardingReminderSent unexpected error', { error: err, context: { profile_id: profileId } })
    return { ok: false, error: 'unknown' }
  }
}
