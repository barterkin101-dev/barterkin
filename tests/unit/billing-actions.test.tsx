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

  it('defaults to annual premium checkout', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://checkout.stripe.com/annual',
      }),
    })

    render(<BillingActions canManageBilling={false} tier="free" foundingAvailable={true} />)

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

    render(<BillingActions canManageBilling={false} tier="free" foundingAvailable={false} />)

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

  it('shows a toast when billing startup fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({
        ok: false,
        error: 'Annual billing is not configured yet.',
      }),
    })

    render(<BillingActions canManageBilling={false} tier="free" foundingAvailable={false} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /upgrade to premium annual/i }))

    expect(toastError).toHaveBeenCalledWith('Annual billing is not configured yet.')
    expect(assignMock).not.toHaveBeenCalled()
  })
})
