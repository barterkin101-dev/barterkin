import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildFacebookShareUrl,
  buildListingShareMessage,
  buildXShareUrl,
  ListingShareActions,
} from '@/components/listings/ListingShareActions'

const mockCapture = vi.fn()
const mockWriteText = vi.fn()
const mockOpen = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('ListingShareActions', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockWriteText.mockReset()
    mockOpen.mockReset()

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mockWriteText,
      },
    })

    Object.defineProperty(window, 'open', {
      configurable: true,
      value: mockOpen,
    })
  })

  it('builds the listing share message and network URLs', () => {
    expect(buildListingShareMessage('Vintage Guitar')).toBe('Trade with me on Barterkin: Vintage Guitar')
    expect(buildXShareUrl('https://barterkin.com/listings/test-id', 'Vintage Guitar')).toBe(
      'https://twitter.com/intent/tweet?text=Trade+with+me+on+Barterkin%3A+Vintage+Guitar&url=https%3A%2F%2Fbarterkin.com%2Flistings%2Ftest-id',
    )
    expect(buildFacebookShareUrl('https://barterkin.com/listings/test-id')).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fbarterkin.com%2Flistings%2Ftest-id',
    )
  })

  it('opens an X share intent and tracks the event', async () => {
    render(
      <ListingShareActions
        listingId="listing-1"
        title="Vintage Guitar"
        shareUrl="https://barterkin.com/listings/listing-1"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share on x/i }))

    expect(mockOpen).toHaveBeenCalledWith(
      'https://twitter.com/intent/tweet?text=Trade+with+me+on+Barterkin%3A+Vintage+Guitar&url=https%3A%2F%2Fbarterkin.com%2Flistings%2Flisting-1',
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockCapture).toHaveBeenCalledWith('listing_shared', {
      listing_id: 'listing-1',
      listing_title: 'Vintage Guitar',
      share_target: 'x',
    })
  })

  it('opens a Facebook share intent and tracks the event', async () => {
    render(
      <ListingShareActions
        listingId="listing-1"
        title="Vintage Guitar"
        shareUrl="https://barterkin.com/listings/listing-1"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share on facebook/i }))

    expect(mockOpen).toHaveBeenCalledWith(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fbarterkin.com%2Flistings%2Flisting-1',
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockCapture).toHaveBeenCalledWith('listing_shared', {
      listing_id: 'listing-1',
      listing_title: 'Vintage Guitar',
      share_target: 'facebook',
    })
  })

  it('copies the listing link and tracks the event', async () => {
    mockWriteText.mockResolvedValue(undefined)

    render(
      <ListingShareActions
        listingId="listing-1"
        title="Vintage Guitar"
        shareUrl="https://barterkin.com/listings/listing-1"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /copy link/i }))

    expect(mockWriteText).toHaveBeenCalledWith('https://barterkin.com/listings/listing-1')
    expect(mockCapture).toHaveBeenCalledWith('listing_shared', {
      listing_id: 'listing-1',
      listing_title: 'Vintage Guitar',
      share_target: 'copy-link',
    })
    expect(screen.getByRole('button', { name: /copied link/i })).toBeInTheDocument()
  })
})
