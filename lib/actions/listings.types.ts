export interface SaveListingResult {
  ok: boolean
  listingId?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface DeleteListingResult {
  ok: boolean
  error?: string
}

export interface ToggleListingStatusResult {
  ok: boolean
  error?: string
}

export interface BoostListingResult {
  ok: boolean
  error?: string
  boostedUntil?: string
}
