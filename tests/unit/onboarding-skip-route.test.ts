import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/onboarding/skip/route'
import {
  ONBOARDING_SKIP_COOKIE_MAX_AGE_SECONDS,
  ONBOARDING_SKIP_COOKIE_NAME,
  ONBOARDING_SKIP_COOKIE_VALUE,
} from '@/lib/onboarding-skip'

describe('/onboarding/skip route', () => {
  it('sets the skip cookie and redirects to /directory with a see-other response on POST', async () => {
    const request = new NextRequest('https://barterkin.com/onboarding/skip', {
      method: 'POST',
    })

    const response = await POST(request)

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://barterkin.com/directory')
    const cookie = response.cookies.get(ONBOARDING_SKIP_COOKIE_NAME)
    expect(cookie?.value).toBe(ONBOARDING_SKIP_COOKIE_VALUE)
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(cookie?.path).toBe('/')
    expect(cookie?.maxAge).toBe(ONBOARDING_SKIP_COOKIE_MAX_AGE_SECONDS)
  })

  it('does not mutate cookies on GET and redirects back to onboarding', async () => {
    const request = new NextRequest('https://barterkin.com/onboarding/skip')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://barterkin.com/onboarding')
    expect(response.cookies.getAll()).toHaveLength(0)
  })
})
