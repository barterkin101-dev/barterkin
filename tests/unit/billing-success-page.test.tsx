import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BillingSuccessLoading from '@/app/(app)/dashboard/billing/success/loading'
import BillingSuccessError from '@/app/(app)/dashboard/billing/success/error'
import { createClient } from '@/lib/supabase/server'
import { captureEventFireAndForget } from '@/lib/analytics'

const redirectMock = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEventFireAndForget: vi.fn(),
}))

vi.mock('@/lib/utils/client-logger', () => ({
  clientLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

async function renderPage(tier?: string) {
  const { default: Page } = await import('@/app/(app)/dashboard/billing/success/page')
  return render(await Page({ searchParams: Promise.resolve(tier ? { tier } : {}) }))
}

describe('billing success route fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the loading skeleton', () => {
    render(<BillingSuccessLoading />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders the error state with retry', () => {
    render(<BillingSuccessError error={new Error('boom')} reset={vi.fn()} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/couldn't load your billing confirmation/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('renders the active subscription success state and tracks the view', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'profile-1', tier: 'founding', display_name: 'Naeem' },
            }),
          })),
        })),
      })),
    } as never)

    await renderPage('founding')

    expect(screen.getByRole('heading', { name: /welcome to founding member/i })).toBeInTheDocument()
    expect(screen.getByText(/your founding member subscription is active/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create a listing/i })).toHaveAttribute('href', '/dashboard/listings/new')
    expect(captureEventFireAndForget).toHaveBeenCalledWith('profile-1', 'billing_success_viewed', {
      expected_tier: 'founding',
      actual_tier: 'founding',
      status: 'active',
    })
  })

  it('renders the processing state when Stripe webhook sync has not landed yet', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'profile-2', tier: 'free', display_name: 'Naeem' },
            }),
          })),
        })),
      })),
    } as never)

    await renderPage('premium')

    expect(screen.getByRole('heading', { name: /premium payment received/i })).toBeInTheDocument()
    expect(screen.getByText(/we received your payment for premium/i)).toBeInTheDocument()
    expect(screen.getByText(/activating premium/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create a listing/i })).not.toBeInTheDocument()
    expect(captureEventFireAndForget).toHaveBeenCalledWith('profile-2', 'billing_success_viewed', {
      expected_tier: 'premium',
      actual_tier: 'free',
      status: 'processing',
    })
  })

  it('redirects unauthenticated visitors to login', async () => {
    redirectMock.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    } as never)

    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT')

    expect(redirectMock).toHaveBeenCalledWith('/login')
  })
})
