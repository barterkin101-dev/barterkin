import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

import { createClient } from '@/lib/supabase/server'
import { captureEvent } from '@/lib/analytics'
import { redirect } from 'next/navigation'

// We test the onboarding page logic by importing and calling the default export
// with mocked searchParams. The component is async, so we await it.
// Note: React server components can't be fully rendered in Vitest without
// additional setup, so we test the data layer and side effects directly.

function makeClient(overrides?: {
  getUser?: ReturnType<typeof vi.fn>
  from?: ReturnType<typeof vi.fn>
}) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: overrides?.getUser ?? vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: overrides?.from ?? vi.fn(),
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('onboarding page analytics', () => {
  it('fires onboarding_started event only when onboarding_started_at is null', async () => {
    const updateIs = vi.fn().mockResolvedValue({ error: null })
    const updateEq = vi.fn().mockReturnValue({ is: updateIs })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq })

    const profileMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: 'Naeem',
        avatar_url: null,
        county_id: 1,
        category_id: 1,
        onboarding_completed_at: null,
        onboarding_started_at: null,
        skills_offered: [],
      },
      error: null,
    })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const fromMock = vi.fn().mockReturnValue({
      select: profileSelect,
      update: updateFn,
    })

    makeClient({ from: fromMock })

    // Dynamically import the page to ensure mocks are in place
    const { default: OnboardingPage } = await import('@/app/(onboarding)/onboarding/page')

    // Call the page component with searchParams
    await OnboardingPage({ searchParams: Promise.resolve({ step: '1' }) })

    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith('user-1', 'onboarding_started', {
      method: 'first',
    })
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_started_at: expect.any(String) }),
    )
    // Verify the UPDATE chain includes the idempotent guard (.is null)
    expect(updateEq).toHaveBeenCalledWith('owner_id', 'user-1')
    expect(updateIs).toHaveBeenCalledWith('onboarding_started_at', null)
  })

  it('does NOT fire onboarding_started when onboarding_started_at is already set', async () => {
    const profileMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: 'Naeem',
        avatar_url: null,
        county_id: 1,
        category_id: 1,
        onboarding_completed_at: null,
        onboarding_started_at: '2026-05-10T12:00:00.000Z',
        skills_offered: [],
      },
      error: null,
    })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const fromMock = vi.fn().mockReturnValue({
      select: profileSelect,
    })

    makeClient({ from: fromMock })

    const { default: OnboardingPage } = await import('@/app/(onboarding)/onboarding/page')
    await OnboardingPage({ searchParams: Promise.resolve({ step: '1' }) })

    expect(vi.mocked(captureEvent)).not.toHaveBeenCalled()
  })

  it('redirects to /directory when onboarding_completed_at is set', async () => {
    const profileMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: 'Naeem',
        avatar_url: null,
        county_id: 1,
        category_id: 1,
        onboarding_completed_at: '2026-05-10T12:00:00.000Z',
        onboarding_started_at: '2026-05-10T11:00:00.000Z',
        skills_offered: [],
      },
      error: null,
    })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const fromMock = vi.fn().mockReturnValue({
      select: profileSelect,
    })

    makeClient({ from: fromMock })

    const { default: OnboardingPage } = await import('@/app/(onboarding)/onboarding/page')
    await expect(OnboardingPage({ searchParams: Promise.resolve({ step: '1' }) })).rejects.toThrow('NEXT_REDIRECT')

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/directory')
    expect(vi.mocked(captureEvent)).not.toHaveBeenCalled()
  })

  it('redirects to /login when user is not authenticated', async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    makeClient({
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      from: fromMock,
    })

    const { default: OnboardingPage } = await import('@/app/(onboarding)/onboarding/page')
    await expect(OnboardingPage({ searchParams: Promise.resolve({ step: '1' }) })).rejects.toThrow('NEXT_REDIRECT')

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/login')
    expect(vi.mocked(captureEvent)).not.toHaveBeenCalled()
  })

  it('uses skills_offered count for profile completeness', async () => {
    const profileMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: 'Naeem',
        avatar_url: null,
        county_id: 1,
        category_id: 1,
        onboarding_completed_at: null,
        onboarding_started_at: '2026-05-10T12:00:00.000Z',
        skills_offered: [{ id: 'skill-1' }, { id: 'skill-2' }],
      },
      error: null,
    })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const fromMock = vi.fn().mockReturnValue({
      select: profileSelect,
    })

    makeClient({ from: fromMock })

    const { default: OnboardingPage } = await import('@/app/(onboarding)/onboarding/page')
    // Should not throw — profile has skills so completeness check passes
    await OnboardingPage({ searchParams: Promise.resolve({ step: '1' }) })

    // Verify the SELECT query was called with the correct column list
    expect(profileSelect).toHaveBeenCalledWith(
      'display_name, avatar_url, county_id, category_id, onboarding_completed_at, onboarding_started_at, skills_offered(id)',
    )
  })
})
