import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseActionState } = vi.hoisted(() => ({
  mockUseActionState: vi.fn(),
}))

const mockCapture = vi.fn()

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useActionState: mockUseActionState,
  }
})

vi.mock('@/lib/actions/profile', () => ({
  enableWeeklyDigestFromDashboard: vi.fn(),
}))

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

import { DigestOptOutReminder } from '@/components/dashboard/DigestOptOutReminder'

describe('DigestOptOutReminder', () => {
  beforeEach(() => {
    mockUseActionState.mockReset()
    mockCapture.mockReset()
  })

  it('renders the one-click CTA and tracks impression and click events', async () => {
    const user = userEvent.setup()
    mockUseActionState.mockReturnValue([null, vi.fn(), false])

    render(<DigestOptOutReminder href="/profile/edit" />)

    expect(screen.getByText('Weekly digest is turned off')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Turn digest back on' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage email settings/i })).toHaveAttribute('href', '/profile/edit')
    expect(mockCapture).toHaveBeenCalledWith('digest_opt_out_reminder_impression', {
      source: 'dashboard',
    })

    await user.click(screen.getByRole('button', { name: 'Turn digest back on' }))

    expect(mockCapture).toHaveBeenCalledWith('digest_opt_out_reminder_clicked', {
      source: 'dashboard',
    })
  })

  it('renders the success state after re-enabling the digest', () => {
    mockUseActionState.mockReturnValue([{ ok: true }, vi.fn(), false])

    render(<DigestOptOutReminder href="/profile/edit" />)

    expect(screen.getByText('Weekly digest is back on')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Digest enabled' })).toBeDisabled()
    expect(screen.getByText(/you'll get the next roundup/i)).toBeInTheDocument()
  })
})
