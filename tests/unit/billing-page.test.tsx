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

  it('shows the founding deadline callout when free members can still claim a slot', async () => {
    mockBillingData({ tier: 'free', foundingCount: 12 })

    await renderPage()

    expect(screen.getByText('Founding pricing closes when these slots are gone.')).toBeInTheDocument()
    expect(screen.getByText('Lock in Founding Member at $5/month for an annualized $60, saving $30 versus Premium Annual and $48 versus Premium Monthly.')).toBeInTheDocument()
    expect(screen.getByText('88 of 100 founding slots are still available for free members upgrading today.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /claim founding pricing/i })).toHaveAttribute('href', '#founding-checkout')
  })

  it('hides the upgrade savings callout for paid members', async () => {
    mockBillingData({ tier: 'premium', stripeCustomerId: 'cus_123' })

    await renderPage()

    expect(screen.queryByText('Annual Premium saves $18 per year.')).not.toBeInTheDocument()
    expect(screen.queryByText('Founding pricing closes when these slots are gone.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument()
  })

  it('hides the founding deadline callout when slots are sold out', async () => {
    mockBillingData({ tier: 'free', foundingCount: 100 })

    await renderPage()

    expect(screen.queryByText('Founding pricing closes when these slots are gone.')).not.toBeInTheDocument()
  })
})
