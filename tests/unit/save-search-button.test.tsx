import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

import { SaveSearchButton } from '@/components/directory/SaveSearchButton'

describe('SaveSearchButton', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders save search button', () => {
    render(
      <SaveSearchButton
        profileId="prof-1"
        query="eggs"
        categoryId={1}
        countyId={131}
      />,
    )
    expect(screen.getByLabelText('Save this search')).toBeInTheDocument()
  })

  it('shows saved state after successful save', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))

    render(
      <SaveSearchButton
        profileId="prof-1"
        query="eggs"
        categoryId={1}
        countyId={131}
      />,
    )

    await user.click(screen.getByLabelText('Save this search'))
    expect(screen.getByText(/saved/i)).toBeInTheDocument()
    expect(mockCapture).toHaveBeenCalledWith('saved_search_created', {
      query: 'eggs',
      category_id: 1,
      county_id: 131,
    })
  })

  it('does not fire analytics when save fails', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })))

    render(
      <SaveSearchButton
        profileId="prof-1"
        query="eggs"
        categoryId={1}
        countyId={131}
      />,
    )

    await user.click(screen.getByLabelText('Save this search'))
    // Button should still show "Save search" text, not "Saved"
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('does not allow double-click while pending', async () => {
    const user = userEvent.setup()
    let resolveFetch!: (value: { ok: boolean }) => void
    const fetchPromise = new Promise<{ ok: boolean }>((resolve) => {
      resolveFetch = resolve
    })
    const fetchMock = vi.fn(() => fetchPromise)
    vi.stubGlobal('fetch', fetchMock)

    render(
      <SaveSearchButton
        profileId="prof-1"
        query="eggs"
        categoryId={1}
        countyId={131}
      />,
    )

    const btn = screen.getByLabelText('Save this search')
    await user.click(btn)
    await user.click(btn)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    resolveFetch({ ok: true })
  })
})
