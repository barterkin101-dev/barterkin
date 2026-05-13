'use server'

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

/**
 * markOnboardingComplete — writes profiles.onboarding_completed_at = now() for the current user.
 * Also triggers referral credit award if the user signed up via a referral link.
 *
 * D-11: called during Step 3 server-component render. Reaching Step 3 = wizard done,
 * regardless of whether the user has sent a contact request.
 *
 * Idempotency: the UPDATE is guarded by .is('onboarding_completed_at', null) so a second
 * render (e.g. user navigates back to Step 3) is a no-op at the DB layer.
 *
 * Security:
 *   - getUser() revalidates the JWT (CLAUDE.md mandate for DML-adjacent decisions).
 *   - .eq('owner_id', user.id) scopes the write to the authenticated user.
 *   - RLS "Owners update own profile" policy is authoritative (T-9-05).
 *
 * Failure mode: silent degradation — return { ok: false } but let Step 3 render.
 */
export async function markOnboardingComplete(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('owner_id', user.id)
    .is('onboarding_completed_at', null)

  if (error) {
    const log = createLogger('onboarding')
    log.error('markOnboardingComplete update failed', { context: { code: error.code } })
    return { ok: false }
  }

  // Award referral credits (non-blocking, best-effort)
  try {
    // Get profile id for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (profile?.id) {
      await supabase.rpc('award_referral_credits', { p_invitee_id: profile.id })
    }
  } catch (err) {
    const log = createLogger('onboarding')
    log.error('referral credit award failed', { error: err })
    // Don't fail the onboarding flow if credit award fails
  }

  return { ok: true }
}
