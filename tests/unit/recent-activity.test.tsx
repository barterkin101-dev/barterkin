import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { RecentActivity } from '@/components/landing/RecentActivity'
import type { ActivityItem } from '@/lib/data/landing-activity'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

const makeItems = (count: number): ActivityItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    type: 'new_listing',
    countyName: 'Cobb',
    title: 'New listing',
    subtitle: `Someone in Cobb listed item ${i}`,
    timeAgo: '5m ago',
  }))

describe('RecentActivity', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('renders empty state when no items', () => {
    render(<RecentActivity items={[]} />)
    expect(screen.getByText('Be the first to make a trade today.')).toBeInTheDocument()
  })

  it('renders activity cards when items present', () => {
    render(<RecentActivity items={makeItems(3)} />)
    expect(screen.getByText('Someone in Cobb listed item 0')).toBeInTheDocument()
    expect(screen.getByText('Someone in Cobb listed item 1')).toBeInTheDocument()
    expect(screen.getByText('Someone in Cobb listed item 2')).toBeInTheDocument()
  })

  it('fires landing_social_proof_viewed with item_count on mount', () => {
    render(<RecentActivity items={makeItems(4)} />)
    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith('landing_social_proof_viewed', {
      item_count: 4,
      has_activity: true,
    })
  })

  it('fires landing_social_proof_viewed with has_activity=false when empty', () => {
    render(<RecentActivity items={[]} />)
    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith('landing_social_proof_viewed', {
      item_count: 0,
      has_activity: false,
    })
  })

  it('does not fire analytics event twice on re-render', () => {
    const { rerender } = render(<RecentActivity items={makeItems(2)} />)
    expect(mockCapture).toHaveBeenCalledTimes(1)
    rerender(<RecentActivity items={makeItems(3)} />)
    expect(mockCapture).toHaveBeenCalledTimes(1)
  })
})
