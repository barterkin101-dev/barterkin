import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createClient } from '@/lib/supabase/server'

const redirectMock = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

async function renderPage() {
  const { default: Page } = await import('@/app/(app)/dashboard/billing/page')
  return render(await Page())
}

function mockBillingData({
  tier,
  stripeCustomerId = null,
  foundingCount = 12,
}: {
  tier: 'free' | 'premium' | 'founding'
  stripeCustomerId?: string | null
  foundingCount?: number
}) {
  const profileQuery = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'profile-1',
            tier,
            stripe_customer_id: stripeCustomerId,
            subscription_current_period_end: null,
          },
        }),
      })),
    })),
  }

  const countQuery = {
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        count: foundingCount,
      }),
    })),
  }

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
    },
    from: vi.fn((table: string) => (table === 'profiles' && !profileQuery.select.mock.calls.length ? profileQuery : countQuery)),
  } as never)
}

describe('/dashboard/billing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the annual savings callout for free members', async () => {
    mockBillingData({ tier: 'free' })

    await renderPage()

    expect(screen.getByText('Annual Premium saves $18 per year.')).toBeInTheDocument()
    expect(screen.getByText('That is $7.50/month instead of $9/month when paid month-to-month.')).toBeInTheDocument()
    expect(screen.getByText('Works out to $7.50/month billed yearly')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upgrade to premium annual .* \$90\/yr/i })).toBeInTheDocument()
  })

  it('hides the upgrade savings callout for paid members', async () => {
    mockBillingData({ tier: 'premium', stripeCustomerId: 'cus_123' })

    await renderPage()

    expect(screen.queryByText('Annual Premium saves $18 per year.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument()
  })
})
