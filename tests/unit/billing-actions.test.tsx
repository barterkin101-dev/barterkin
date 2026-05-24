import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillingActions } from '@/components/dashboard/BillingActions'

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}))

describe('BillingActions', () => {
  const fetchMock = vi.fn()
  const assignMock = vi.fn()
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        assign: assignMock,
      },
    })
  })

  it('shows switch-to-annual for monthly premium members', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://billing.stripe.com/portal/switch',
      }),
    })

    render(
      <BillingActions
        canManageBilling={true}
        tier="premium"
        billingInterval="monthly"
        foundingAvailable={false}
      />,
    )

    expect(screen.getByRole('button', { name: /switch to annual/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: /switch to annual/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stripe/customer-portal',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ flow: 'switch_to_annual' }),
      }),
    )
    expect(assignMock).toHaveBeenCalledWith('https://billing.stripe.com/portal/switch')
  })

  it('hides switch-to-annual for annual premium members', () => {
    render(
      <BillingActions
        canManageBilling={true}
        tier="premium"
        billingInterval="annual"
        foundingAvailable={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /switch to annual/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument()
  })

  it('hides switch-to-annual for founding members', () => {
    render(
      <BillingActions
        canManageBilling={true}
        tier="founding"
        billingInterval="monthly"
        foundingAvailable={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /switch to annual/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument()
  })

  it('shows lifetime active state for lifetime members', () => {
    render(
      <BillingActions
        canManageBilling={false}
        tier="lifetime"
        billingInterval={null}
        foundingAvailable={false}
      />,
    )

    expect(screen.getByText('Lifetime Premium is active')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /manage billing/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /switch to annual/i })).not.toBeInTheDocument()
  })

  it('defaults to annual premium checkout', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://checkout.stripe.com/annual',
      }),
    })

    render(<BillingActions canManageBilling={false} tier="free" billingInterval={null} foundingAvailable={true} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /upgrade to premium annual/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stripe/checkout-session',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ priceId: 'annual' }),
      }),
    )
    expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.com/annual')
  })

  it('switches to monthly checkout when monthly is selected', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://checkout.stripe.com/monthly',
      }),
    })

    render(<BillingActions canManageBilling={false} tier="free" billingInterval={null} foundingAvailable={false} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /monthly/i }))
    await user.click(screen.getByRole('button', { name: /upgrade to premium/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stripe/checkout-session',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ priceId: 'premium' }),
      }),
    )
    expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.com/monthly')
  })

  it('starts lifetime checkout when lifetime button is clicked', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://checkout.stripe.com/lifetime',
      }),
    })

    render(<BillingActions canManageBilling={false} tier="free" billingInterval={null} foundingAvailable={false} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /go lifetime/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stripe/checkout-session',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ priceId: 'lifetime' }),
      }),
    )
    expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.com/lifetime')
  })

  it('shows a toast when billing startup fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({
        ok: false,
        error: 'Annual billing is not configured yet.',
      }),
    })

    render(<BillingActions canManageBilling={false} tier="free" billingInterval={null} foundingAvailable={false} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /upgrade to premium annual/i }))

    expect(toastError).toHaveBeenCalledWith('Annual billing is not configured yet.')
    expect(assignMock).not.toHaveBeenCalled()
  })
})
