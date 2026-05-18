import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createClient } from '@/lib/supabase/server'

const redirectMock = vi.fn(() => {
  throw new Error('NEXT_REDIRECT')
})

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

async function renderPage() {
  const { default: Page } = await import('@/app/(app)/referrals/page')
  return render(await Page())
}

function mockReferralData({
  referralCode = 'AB12CD34',
  referrals = [],
  creditRows = [],
}: {
  referralCode?: string | null
  referrals?: { id: string; credited_at: string | null }[]
  creditRows?: { amount: number; reason: string }[]
}) {
  const profileQuery = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'profile-1',
            referral_code: referralCode,
            display_name: 'Test User',
          },
        }),
      })),
    })),
  }

  const referralQuery = {
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        data: referrals,
      }),
    })),
  }

  const creditQuery = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: creditRows.filter((row) =>
            ['referral_bonus', 'referral_welcome', 'quest_referral_converted'].includes(row.reason),
          ),
        }),
      })),
    })),
  }

  let callCount = 0
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
    },
    from: vi.fn((table: string) => {
      callCount++
      if (table === 'profiles' && callCount === 1) return profileQuery
      if (table === 'referrals') return referralQuery
      if (table === 'credit_ledger') return creditQuery
      return {}
    }),
  } as never)
}

describe('/referrals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated users to login', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          })),
        })),
      })),
    } as never)

    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/login?returnTo=/referrals')
  })

  it('shows referral stats with referral-specific credits only', async () => {
    mockReferralData({
      referralCode: 'AB12CD34',
      referrals: [
        { id: 'ref-1', credited_at: '2026-05-10T00:00:00Z' },
        { id: 'ref-2', credited_at: null },
      ],
      creditRows: [
        { amount: 10, reason: 'quest_referral_converted' },
        { amount: 2, reason: 'referral_bonus' },
        { amount: 5, reason: 'quest_first_listing' }, // should be excluded
      ],
    })

    await renderPage()

    // 10 + 2 = 12 referral credits; 5 from quest_first_listing should be excluded
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Credits earned')).toBeInTheDocument()
    expect(screen.getByText('Converted')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows zero credits when no referral transactions exist', async () => {
    mockReferralData({
      referralCode: 'AB12CD34',
      referrals: [],
      creditRows: [],
    })

    await renderPage()

    // All three stat cards show 0
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Credits earned')).toBeInTheDocument()
  })

  it('filters credit_ledger to referral reasons only', async () => {
    mockReferralData({
      referralCode: 'AB12CD34',
      referrals: [],
      creditRows: [
        { amount: 5, reason: 'quest_first_listing' },
        { amount: 3, reason: 'quest_daily_login' },
      ],
    })

    await renderPage()

    // Non-referral credits should be excluded; credits card should show 0
    const creditsCard = screen.getByText('Credits earned').closest('[data-slot="card"]')
    expect(creditsCard).toHaveTextContent('0')
  })

  it('renders with zeros when referral query errors', async () => {
    const profileQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'profile-1',
              referral_code: 'AB12CD34',
              display_name: 'Test User',
            },
          }),
        })),
      })),
    }

    const referralQuery = {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'relation does not exist' },
        }),
      })),
    }

    const creditQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'relation does not exist' },
          }),
        })),
      })),
    }

    let callCount = 0
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
      from: vi.fn((table: string) => {
        callCount++
        if (table === 'profiles' && callCount === 1) return profileQuery
        if (table === 'referrals') return referralQuery
        if (table === 'credit_ledger') return creditQuery
        return {}
      }),
    } as never)

    await renderPage()

    // Should still render with zeros, not crash
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Credits earned')).toBeInTheDocument()
    expect(screen.getByText('Converted')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })
})
