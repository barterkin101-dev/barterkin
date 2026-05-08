'use client'

import { ListingCard } from './ListingCard'
import type { ListingRow } from '@/lib/data/listings.types'

export function ListingGrid({ listings }: { listings: ListingRow[] }) {
  if (listings.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted-foreground">No listings found.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters or check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
