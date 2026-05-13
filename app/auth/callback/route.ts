import { NextResponse, type NextRequest } from 'next/server'
import { getLandingHeroExperimentProperties } from '@/lib/ab-testing-shared'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import { getClientIp, limitOAuthCallback } from '@/lib/rate-limit-public'
import { captureEvent } from '@/lib/analytics'
import { REFERRAL_COOKIE_NAME, normalizeReferralCode } from '@/lib/referrals'

/**
 * AUTH-01: Google OAuth callback.
 * Supabase redirects here with ?code=<...> after Google consent.
 * We exchange the code for a session (cookies set via @supabase/ssr adapter)
 * and redirect to ?next (open-redirect guarded) or /directory.
 */
export async function GET(request: NextRequest) {
  // Rate limit OAuth callback to prevent brute-force code guessing
  const ip = await getClientIp()
  const limit = await limitOAuthCallback(ip)
  if (!limit.success) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/error?reason=rate_limited`,
    )
  }

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/directory'
  const experimentProperties = getLandingHeroExperimentProperties(searchParams.get('abv'))
  // T-2-01 open-redirect guard: only allow relative paths starting with '/'
  const next = (nextParam.startsWith('/') && !nextParam.startsWith('//')) ? nextParam : '/directory'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const user = data?.user
      if (user) {
        void captureEvent(user.id, 'signup_completed', {
          method: 'google_oauth',
          ...experimentProperties,
        })
        // Capture referral if cookie present
        await captureReferral(request, supabase, user.id)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    const log = createLogger('auth')
    log.error('exchangeCodeForSession failed', { context: {
        code: error.code,
      status: error.status,
      } })
  }

  return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`)
}

/**
 * Read referral cookie and create referrals row if valid.
 * Non-blocking — failures are logged but don't break auth flow.
 */
async function captureReferral(
  request: NextRequest,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const referralCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value
  const normalized = normalizeReferralCode(referralCode)
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
      method: 'google_oauth',
    })
  } catch (err) {
    const log = createLogger('auth')
    log.error('referral capture failed', { error: err })
  }
}
