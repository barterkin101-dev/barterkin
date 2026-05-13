import type { ListingRow } from '@/lib/data/listings.types'

export interface SaveListingToggleResult {
  ok: boolean
  saved?: boolean
  listingId?: string
  error?: string
}

export interface GetSavedListingsResult {
  ok: boolean
  savedListings?: Array<{
    id: string
    created_at: string
    listing: ListingRow | null
  }>
  error?: string
}
