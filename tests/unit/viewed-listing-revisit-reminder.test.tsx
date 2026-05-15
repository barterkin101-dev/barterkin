import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ViewedListingRevisitReminder } from '@/components/dashboard/ViewedListingRevisitReminder'

describe('ViewedListingRevisitReminder', () => {
  it('renders the edit CTA and profile-view coaching copy', () => {
    render(
      <ViewedListingRevisitReminder
        reminder={{
          href: '/dashboard/listings/listing-1/edit',
          listingTitle: 'Vintage camera bundle',
          listingId: 'listing-1',
          daysSincePublished: 8,
          profileViewCount: 4,
        }}
      />,
    )

    expect(screen.getByRole('link', { name: /rework listing/i })).toHaveAttribute(
      'href',
      '/dashboard/listings/listing-1/edit',
    )
    expect(
      screen.getByText(/has been live for 8 days with 4 profile views, but no saves yet/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/tighten the photos, title, or trade terms/i)).toBeInTheDocument()
  })
})
