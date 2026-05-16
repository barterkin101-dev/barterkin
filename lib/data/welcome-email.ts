/**
 * Welcome email data layer
 *
 * WELCOME-01: send welcome email to new signups (idempotent)
 * WELCOME-02: track sends to prevent duplicates
 */
import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('welcome-email')

export interface WelcomeEmailRecipient {
  id: string
  display_name: string | null
  username: string | null
  owner_id: string
}

export async function getWelcomeEmailRecipient(profileId: string): Promise<{
  recipient: WelcomeEmailRecipient | null
  error: string | null
}> {
  const admin = getSupabaseAdmin()

  try {
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, display_name, username, owner_id, welcome_email_sent_at')
      .eq('id', profileId)
      .maybeSingle()

    if (error) {
      log.error('Failed to fetch welcome email recipient', { error, context: { profile_id: profileId } })
      return { recipient: null, error: 'fetch_failed' }
    }

    if (!profile) {
      return { recipient: null, error: 'profile_not_found' }
    }

    // Idempotent: only send if not already sent
    if (profile.welcome_email_sent_at) {
      return { recipient: null, error: 'already_sent' }
    }

    const { welcome_email_sent_at, ...recipient } = profile
    return { recipient: recipient as WelcomeEmailRecipient, error: null }
  } catch (err) {
    log.error('getWelcomeEmailRecipient unexpected error', { error: err, context: { profile_id: profileId } })
    return { recipient: null, error: 'unknown' }
  }
}

export async function recordWelcomeEmailSent(profileId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()

  try {
    const { error } = await admin
      .from('profiles')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', profileId)

    if (error) {
      log.error('Failed to record welcome email sent', {
        error,
        context: { profile_id: profileId },
      })
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    log.error('recordWelcomeEmailSent unexpected error', { error: err, context: { profile_id: profileId } })
    return { ok: false, error: 'unknown' }
  }
}
