import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock server components / async page
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/actions/saved-listings', () => ({
  getSavedListings: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/components/listings/ListingGrid', () => ({
  ListingGrid: ({ listings }: { listings: unknown[] }) => (
    <div data-testid="listing-grid">{listings.length} listings</div>
  ),
}))

import { createClient } from '@/lib/supabase/server'
import { getSavedListings } from '@/lib/actions/saved-listings'

const mockGetSavedListings = vi.mocked(getSavedListings)

async function renderPage() {
  const { default: Page } = await import('@/app/(app)/dashboard/saved/page')
  return render(await Page())
}

describe('/dashboard/saved', () => {
  it('shows sign-in prompt when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    await renderPage()
    expect(screen.getByText(/Please sign in/i)).toBeInTheDocument()
  })

  it('shows empty state when no saved listings', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    } as never)

    mockGetSavedListings.mockResolvedValue({ ok: true, savedListings: [] })

    await renderPage()
    expect(screen.getByText(/No saved listings yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Browse listings/i })).toHaveAttribute('href', '/listings')
  })

  it('shows error state when getSavedListings fails', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    } as never)

    mockGetSavedListings.mockResolvedValue({ ok: false, error: 'DB error' })

    await renderPage()
    expect(screen.getByText(/Couldn.t load your saved listings/i)).toBeInTheDocument()
    expect(screen.getByText(/DB error/i)).toBeInTheDocument()
  })

  it('renders listing grid when saved listings exist', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    } as never)

    mockGetSavedListings.mockResolvedValue({
      ok: true,
      savedListings: [
        {
          id: 'sl1',
          created_at: '2024-01-01T00:00:00Z',
          listing: {
            id: 'l1',
            title: 'Guitar',
            description: 'Nice guitar',
            status: 'active',
            condition: 'good',
            price_estimate: '$200',
            trade_terms: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            profile_id: 'p1',
            county_id: 1,
            category_id: 1,
            boosted_until: null,
            featured_until: null,
            images: [],
            profiles: { id: 'p1', display_name: 'Alice', username: 'alice', avatar_url: null, accepting_contact: true },
            counties: { name: 'Fulton' },
            categories: { name: 'Music' },
          },
        },
      ],
    })

    await renderPage()
    expect(screen.getByTestId('listing-grid')).toHaveTextContent('1 listings')
  })
})
