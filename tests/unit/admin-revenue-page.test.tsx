import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdminRevenueLoading from '@/app/(admin)/admin/revenue/loading'
import AdminRevenueError from '@/app/(admin)/admin/revenue/error'
import { getRevenueStats } from '@/lib/data/admin'

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('@/lib/data/admin', () => ({
  getRevenueStats: vi.fn(),
}))

async function renderPage() {
  const { default: Page } = await import('@/app/(admin)/admin/revenue/page')
  return render(await Page())
}

describe('admin revenue route fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the loading skeleton', () => {
    render(<AdminRevenueLoading />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders the error state with retry', () => {
    render(<AdminRevenueError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.getByText(/revenue dashboard error/i)).toBeInTheDocument()
    expect(screen.getByText(/couldn't load subscription metrics right now/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('renders revenue metrics and recent events', async () => {
    vi.mocked(getRevenueStats).mockResolvedValue({
      mrr: 68,
      payingMembers: 9,
      premiumCount: 4,
      foundingCount: 6,
      freeCount: 24,
      conversionRate: 27.3,
      foundingSlotsRemaining: 94,
      recentEvents: [
        {
          id: 'profile-1',
          display_name: 'Naeem',
          tier: 'founding',
          event_type: 'upgrade',
          occurred_at: '2026-05-13T12:00:00.000Z',
        },
        {
          id: 'profile-2',
          display_name: 'Former member',
          tier: 'free',
          event_type: 'cancel',
          occurred_at: '2026-05-12T12:00:00.000Z',
        },
      ],
    })

    await renderPage()

    expect(screen.getByRole('heading', { name: /revenue/i })).toBeInTheDocument()
    expect(screen.getByText('$68')).toBeInTheDocument()
    expect(screen.getByText('27.3%')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByText('Founding')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /review the member-facing billing page/i })).toHaveAttribute('href', '/dashboard/billing')
  })

  it('renders the empty state when there is no subscription activity', async () => {
    vi.mocked(getRevenueStats).mockResolvedValue({
      mrr: 0,
      payingMembers: 0,
      premiumCount: 0,
      foundingCount: 0,
      freeCount: 12,
      conversionRate: 0,
      foundingSlotsRemaining: 100,
      recentEvents: [],
    })

    await renderPage()

    expect(screen.getByText(/no subscription activity yet/i)).toBeInTheDocument()
  })
})
