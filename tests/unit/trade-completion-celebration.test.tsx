import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TradeCompletionCelebration } from '@/components/messaging/TradeCompletionCelebration'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

vi.mock('@/lib/actions/trade-completions', () => ({
  submitTradeReview: vi.fn(),
}))

const CONV_ID = 'conv-123'
const OTHER_ID = 'other-456'

function setupLocalStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
  }
}

beforeEach(() => {
  mockCapture.mockClear()
  const ls = setupLocalStorage()
  Object.defineProperty(window, 'localStorage', { value: ls, writable: true })
})

describe('TradeCompletionCelebration', () => {
  it('does not render when trade is not completed', () => {
    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={false}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
      />,
    )
    expect(screen.queryByText('Trade Complete!')).not.toBeInTheDocument()
  })

  it('does not render when user has already reviewed', () => {
    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={true}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
        hasReviewed={true}
      />,
    )
    expect(screen.queryByText('Trade Complete!')).not.toBeInTheDocument()
  })

  it('opens modal when trade is mutually completed and not dismissed', async () => {
    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={true}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Trade Complete!')).toBeInTheDocument()
    })

    expect(screen.getByText(/You and Alex successfully completed a trade/)).toBeInTheDocument()
    expect(mockCapture).toHaveBeenCalledWith('trade_completion_celebrated', {
      conversation_id: CONV_ID,
      has_reviewed: false,
    })
  })

  it('does not open modal when conversation was previously dismissed', async () => {
    window.localStorage.setItem('barterkin_trade_celebration_dismissed', JSON.stringify([CONV_ID]))

    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={true}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
      />,
    )

    // Wait a bit to ensure modal doesn't open
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.queryByText('Trade Complete!')).not.toBeInTheDocument()
  })

  it('shows star rating buttons', async () => {
    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={true}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
      />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Rate 1 star')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Rate 5 stars')).toBeInTheDocument()
  })

  it('disables submit when no stars selected', async () => {
    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={true}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Submit Review')).toBeInTheDocument()
    })

    const submitBtn = screen.getByText('Submit Review').closest('button')
    expect(submitBtn).toBeDisabled()
  })

  it('enables submit after selecting stars', async () => {
    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={true}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
      />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Rate 4 stars')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Rate 4 stars'))

    const submitBtn = screen.getByText('Submit Review').closest('button')
    expect(submitBtn).not.toBeDisabled()
  })

  it('tracks dismiss via Maybe later button', async () => {
    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={true}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Maybe later')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Maybe later'))

    await waitFor(() => {
      expect(screen.queryByText('Trade Complete!')).not.toBeInTheDocument()
    })

    expect(mockCapture).toHaveBeenCalledWith('review_prompt_dismissed', {
      conversation_id: CONV_ID,
      dismissed_after: 'celebration_modal',
    })

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'barterkin_trade_celebration_dismissed',
      expect.stringContaining(CONV_ID),
    )
  })

  it('includes hidden form fields for review submission', async () => {
    render(
      <TradeCompletionCelebration
        conversationId={CONV_ID}
        isCompleted={true}
        otherProfileId={OTHER_ID}
        otherDisplayName="Alex"
        listingId="listing-789"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Trade Complete!')).toBeInTheDocument()
    })

    const form = screen.getByText('Submit Review').closest('form')
    expect(form).toHaveFormValues({
      conversationId: CONV_ID,
      rateeProfileId: OTHER_ID,
      listingId: 'listing-789',
    })
  })
})
