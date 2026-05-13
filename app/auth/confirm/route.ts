import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import { captureEvent } from '@/lib/analytics'
import { normalizeReferralCode } from '@/lib/referrals'

/**
 * AUTH-02: Magic-link verification.
 * Supabase sends the user here after they click the link in their email.
 * URL shape: /auth/confirm?token_hash=<...>&type=email&next=<path>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const _next = searchParams.get('next')
  // T-2-01 open-redirect guard
  const next = (_next?.startsWith('/') && !_next?.startsWith('//')) ? _next : '/directory'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const user = data?.user
      if (user) {
        void captureEvent(user.id, 'signup_completed', { method: 'magic_link' })
        // Capture referral if ?ref= present in URL
        await captureReferralFromQuery(request, supabase, user.id)
      }
      redirect(next)
    }
    const log = createLogger('auth')
    log.error('verifyOtp failed', { context: {
      code: error?.code,
      status: error?.status,
      // deliberately NOT logging error.message — may contain PII
      } })
    redirect(`/auth/error?reason=verify_failed`)
  }

  redirect(`/auth/error?reason=missing_token`)
}

/**
 * Read ?ref= from URL and create referrals row if valid.
 * Non-blocking — failures are logged but don't break auth flow.
 */
async function captureReferralFromQuery(
  request: NextRequest,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const refParam = request.nextUrl.searchParams.get('ref')
  const normalized = normalizeReferralCode(refParam)
  if (!normalized) return

  try {
    // Look up inviter by referral code
    const { data: inviter } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', normalized)
      .maybeSingle()

    if (!inviter) return

    // Get invitee profile id
    const { data: invitee } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (!invitee || invitee.id === inviter.id) return

    // Create referral record (idempotent — unique on invitee_id)
    await supabase
      .from('referrals')
      .insert({
        inviter_id: inviter.id,
        invitee_id: invitee.id,
        invitee_referral_code: normalized,
      })
      .select()
      .maybeSingle()

    // Track referral usage
    void captureEvent(userId, 'referral_link_used', {
      referral_code: normalized,
      method: 'magic_link',
    })
  } catch (err) {
    const log = createLogger('auth')
    log.error('referral capture failed', { error: err })
  }
}
