export interface ListingFilters {
  q?: string
  categoryId: number | undefined
  countyId: number | undefined
  condition: string | undefined
  page: number
}

export interface ListingImage {
  id: string
  url: string
  sort_order: number
}

export interface ListingRow {
  id: string
  profile_id: string
  title: string
  description: string
  condition: string | null
  trade_terms: string | null
  price_estimate: string | null
  status: string
  created_at: string
  boosted_until: string | null
  images: ListingImage[]
  profiles: {
    id: string
    display_name: string | null
    username: string | null
    avatar_url: string | null
    accepting_contact: boolean | null
    phone_verified?: boolean | null
  } | null
  counties: { name: string } | null
  categories: { name: string } | null
  category_id: number | null
  county_id: number | null
}

export interface ListingsQueryResult {
  listings: ListingRow[]
  totalCount: number
  error: string | null
}
