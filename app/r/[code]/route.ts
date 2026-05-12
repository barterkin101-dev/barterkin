import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
  normalizeReferralCode,
} from '@/lib/referrals'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const normalizedCode = normalizeReferralCode(code)
  const redirectUrl = new URL('/signup', request.url)

  if (!normalizedCode) {
    redirectUrl.searchParams.set('ref_error', 'invalid')
    return NextResponse.redirect(redirectUrl)
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', normalizedCode)
    .maybeSingle()

  if (!profile) {
    redirectUrl.searchParams.set('ref_error', 'unknown')
    return NextResponse.redirect(redirectUrl)
  }

  redirectUrl.searchParams.set('ref', normalizedCode)

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set(REFERRAL_COOKIE_NAME, normalizedCode, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
  })
  return response
}
