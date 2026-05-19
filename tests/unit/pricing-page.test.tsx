import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createClient } from '@/lib/supabase/server'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

async function renderPage() {
  const { default: Page } = await import('@/app/pricing/page')
  return render(await Page())
}

function mockPricingData({
  memberCount = 42,
  foundingCount = 12,
}: {
  memberCount?: number
  foundingCount?: number
} = {}) {
  const memberQuery = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          count: memberCount,
        }),
      })),
    })),
  }

  const foundingQuery = {
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        count: foundingCount,
      }),
    })),
  }

  let callCount = 0
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn(() => {
      callCount++
      return callCount === 1 ? memberQuery : foundingQuery
    }),
  } as never)
}

describe('/pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all three plan cards', async () => {
    mockPricingData()

    await renderPage()

    // Use getAllByText since "Free" appears in both card title and table header
    expect(screen.getAllByText('Free').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Premium Annual')).toBeInTheDocument()
    expect(screen.getByText('Founding Member')).toBeInTheDocument()
  })

  it('shows correct pricing', async () => {
    mockPricingData()

    await renderPage()

    expect(screen.getByText('$0')).toBeInTheDocument()
    expect(screen.getByText('$7.50')).toBeInTheDocument()
    // $5 appears in multiple contexts (price + savings), use getAllByText
    expect(screen.getAllByText('$5').length).toBeGreaterThanOrEqual(1)
  })

  it('shows annual savings callout', async () => {
    mockPricingData()

    await renderPage()

    expect(screen.getByText('Save $18/year vs monthly')).toBeInTheDocument()
  })

  it('shows founding slots remaining', async () => {
    mockPricingData({ foundingCount: 12 })

    await renderPage()

    expect(screen.getByText('88 of 100 slots left')).toBeInTheDocument()
  })

  it('shows sold out state when founding slots are gone', async () => {
    mockPricingData({ foundingCount: 100 })

    await renderPage()

    expect(screen.getByText('Currently sold out')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sold out/i })).toBeDisabled()
  })

  it('shows member count in social proof', async () => {
    mockPricingData({ memberCount: 150 })

    await renderPage()

    expect(screen.getByText('150 members already trading')).toBeInTheDocument()
  })

  it('renders feature comparison table', async () => {
    mockPricingData()

    await renderPage()

    expect(screen.getByText('Compare plans')).toBeInTheDocument()
    expect(screen.getByText('Active listings')).toBeInTheDocument()
    expect(screen.getByText('Monthly contacts')).toBeInTheDocument()
    // Featured placement appears in both card and table — use getAllByText
    expect(screen.getAllByText('Featured placement').length).toBeGreaterThanOrEqual(1)
  })

  it('renders FAQ section', async () => {
    mockPricingData()

    await renderPage()

    expect(screen.getByText('Frequently asked questions')).toBeInTheDocument()
    expect(screen.getByText('Can I really use Barterkin for free?')).toBeInTheDocument()
    expect(screen.getByText('What is a Founding Member?')).toBeInTheDocument()
  })

  it('links signup CTAs to correct plan URLs', async () => {
    mockPricingData()

    await renderPage()

    const annualCta = screen.getByRole('link', { name: /choose annual/i })
    expect(annualCta).toHaveAttribute('href', '/signup?plan=premium-annual')

    const foundingCta = screen.getByRole('link', { name: /claim founding/i })
    expect(foundingCta).toHaveAttribute('href', '/signup?plan=founding')
  })

  it('shows free CTA linking to signup', async () => {
    mockPricingData()

    await renderPage()

    const freeCtas = screen.getAllByRole('link', { name: /get started free/i })
    expect(freeCtas.length).toBeGreaterThanOrEqual(1)
    expect(freeCtas[0]).toHaveAttribute('href', '/signup')
  })
})
