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
    listing: {
      id: string
      title: string
      description: string
      status: string
      condition: string | null
      price_estimate: string | null
      trade_terms: string | null
      created_at: string
      profile_id: string
      county_id: number | null
      category_id: number | null
    } | null
  }>
  error?: string
}
