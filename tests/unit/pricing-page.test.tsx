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

  it('renders all four plan cards', async () => {
    mockPricingData()

    await renderPage()

    // Use getAllByText since "Free" appears in both card title and table header
    expect(screen.getAllByText('Free').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Premium Monthly')).toBeInTheDocument()
    expect(screen.getByText('Premium Annual')).toBeInTheDocument()
    // "Lifetime" appears in both card title and table header — use getAllByText
    expect(screen.getAllByText('Lifetime').length).toBeGreaterThanOrEqual(1)
  })

  it('shows correct pricing', async () => {
    mockPricingData()

    await renderPage()

    expect(screen.getByText('$0')).toBeInTheDocument()
    expect(screen.getByText('$7.50')).toBeInTheDocument()
    expect(screen.getByText('$199')).toBeInTheDocument()
  })

  it('shows annual savings callout', async () => {
    mockPricingData()

    await renderPage()

    expect(screen.getByText('Save $18/year vs monthly')).toBeInTheDocument()
  })

  it('shows lifetime plan card', async () => {
    mockPricingData()

    await renderPage()

    expect(screen.getAllByText('Lifetime').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('$199')).toBeInTheDocument()
    expect(screen.getByText('Never pay again')).toBeInTheDocument()
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

    const lifetimeCta = screen.getByRole('link', { name: /go lifetime/i })
    expect(lifetimeCta).toHaveAttribute('href', '/signup?plan=lifetime')
  })

  it('shows free CTA linking to signup', async () => {
    mockPricingData()

    await renderPage()

    const freeCtas = screen.getAllByRole('link', { name: /get started free/i })
    expect(freeCtas.length).toBeGreaterThanOrEqual(1)
    expect(freeCtas[0]).toHaveAttribute('href', '/signup')
  })
})
