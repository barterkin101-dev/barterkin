import { NextResponse, type NextRequest } from 'next/server'
import {
  ONBOARDING_SKIP_COOKIE_MAX_AGE_SECONDS,
  ONBOARDING_SKIP_COOKIE_NAME,
  ONBOARDING_SKIP_COOKIE_VALUE,
} from '@/lib/onboarding-skip'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/directory', request.url))
  response.cookies.set(ONBOARDING_SKIP_COOKIE_NAME, ONBOARDING_SKIP_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONBOARDING_SKIP_COOKIE_MAX_AGE_SECONDS,
  })
  return response
}
