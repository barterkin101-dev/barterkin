import { NextResponse } from 'next/server'
import { validateUnsubscribeToken } from '@/lib/digest-unsubscribe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

export const runtime = 'nodejs'

const log = createLogger('api:unsubscribe')

/**
 * POST /api/unsubscribe
 *
 * One-click digest unsubscribe. No login required.
 * Body: { profileId: string, token: string }
 * Validates the HMAC token, then sets email_digest_enabled = false.
 */
export async function POST(request: Request) {
  let body: { profileId?: string; token?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const profileId = body.profileId
  const token = body.token

  if (!profileId || typeof profileId !== 'string') {
    return NextResponse.json({ ok: false, error: 'profileId is required.' }, { status: 400 })
  }
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ ok: false, error: 'token is required.' }, { status: 400 })
  }

  const valid = validateUnsubscribeToken(profileId, token)
  if (!valid) {
    log.warn('Invalid unsubscribe token', { context: { profile_id: profileId } })
    return NextResponse.json({ ok: false, error: 'Invalid or expired token.' }, { status: 403 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('profiles')
      .update({ email_digest_enabled: false })
      .eq('id', profileId)

    if (error) {
      log.error('Failed to unsubscribe profile', { error, context: { profile_id: profileId } })
      return NextResponse.json({ ok: false, error: 'Database error.' }, { status: 500 })
    }

    log.info('Profile unsubscribed from digest', { context: { profile_id: profileId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('Unexpected error during unsubscribe', { error: err, context: { profile_id: profileId } })
    return NextResponse.json({ ok: false, error: 'Internal error.' }, { status: 500 })
  }
}
