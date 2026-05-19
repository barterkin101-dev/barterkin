import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

vi.stubGlobal('fetch', vi.fn())

import { SavedSearchesCard } from '@/components/dashboard/SavedSearchesCard'

const makeSearch = (overrides?: Partial<Parameters<typeof SavedSearchesCard>[0]['searches'][number]>) => ({
  id: 'ss-1',
  profile_id: 'prof-1',
  query: 'eggs',
  category_id: 1,
  county_id: 131,
  email_alert_enabled: true,
  last_alert_sent_at: null,
  created_at: '2026-05-19T00:00:00.000Z',
  updated_at: '2026-05-19T00:00:00.000Z',
  category_name: 'Farm',
  county_name: 'Cobb County',
  ...overrides,
})

describe('SavedSearchesCard', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  it('renders empty state when no searches', () => {
    render(<SavedSearchesCard searches={[]} />)
    expect(screen.getByText(/saved searches/i)).toBeInTheDocument()
    expect(screen.getByText(/save directory searches to get alerts/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse directory/i })).toHaveAttribute('href', '/directory')
  })

  it('renders search labels with query, category, and county', () => {
    render(<SavedSearchesCard searches={[makeSearch()]} />)
    expect(screen.getByText(/"eggs" · Farm · Cobb County/i)).toBeInTheDocument()
  })

  it('renders "all listings" when no filters', () => {
    render(<SavedSearchesCard searches={[makeSearch({ query: null, category_id: null, county_id: null, category_name: null, county_name: null })]} />)
    expect(screen.getByText(/all listings/i)).toBeInTheDocument()
  })

  it('links to directory with correct search params', () => {
    render(<SavedSearchesCard searches={[makeSearch()]} />)
    const link = screen.getByRole('link', { name: /"eggs" · Farm · Cobb County/i })
    expect(link).toHaveAttribute('href', '/directory?q=eggs&category=farm&county=131')
  })

  it('toggles alert off and fires analytics', async () => {
    const user = userEvent.setup()
    render(<SavedSearchesCard searches={[makeSearch()]} />)

    const toggleBtn = screen.getByRole('button', { name: /turn off alerts/i })
    await user.click(toggleBtn)

    expect(mockCapture).toHaveBeenCalledWith('saved_search_alert_toggled', {
      search_id: 'ss-1',
      enabled: false,
    })
  })

  it('toggles alert on and fires analytics', async () => {
    const user = userEvent.setup()
    render(<SavedSearchesCard searches={[makeSearch({ email_alert_enabled: false })]} />)

    const toggleBtn = screen.getByRole('button', { name: /turn on alerts/i })
    await user.click(toggleBtn)

    expect(mockCapture).toHaveBeenCalledWith('saved_search_alert_toggled', {
      search_id: 'ss-1',
      enabled: true,
    })
  })

  it('deletes search and fires analytics', async () => {
    const user = userEvent.setup()
    render(<SavedSearchesCard searches={[makeSearch()]} />)

    const deleteBtn = screen.getByRole('button', { name: /remove saved search/i })
    await user.click(deleteBtn)

    expect(mockCapture).toHaveBeenCalledWith('saved_search_deleted', {
      search_id: 'ss-1',
    })
  })

  it('reverts toggle on fetch failure', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })))

    render(<SavedSearchesCard searches={[makeSearch()]} />)

    const toggleBtn = screen.getByRole('button', { name: /turn off alerts/i })
    await user.click(toggleBtn)

    // Should revert back to on state
    expect(screen.getByRole('button', { name: /turn off alerts/i })).toBeInTheDocument()
  })
})
