/**
 * Listings data layer
 *
 * LIST-09 (browse), LIST-10 (filters), LIST-11 (pagination).
 */
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { ListingsQueryResult, ListingRow, ListingFilters } from '@/lib/data/listings.types'

const PAGE_SIZE = 20

export async function getListings(
  filters: ListingFilters,
): Promise<ListingsQueryResult> {
  const supabase = await createClient()

  try {
    console.log('[getListings] start', { filters })
    // Use the search RPC if there's a query; otherwise use plain select
    if (filters.q && filters.q.trim() !== '') {
      const { data: rows, error: rowsErr } = await supabase.rpc(
        'search_listings',
        {
          p_query: filters.q.trim(),
          p_category_id: filters.categoryId ?? null,
          p_county_id: filters.countyId ?? null,
          p_condition: filters.condition ?? null,
          p_page: filters.page,
          p_page_size: PAGE_SIZE,
        } as any,
      )
      if (rowsErr) {
        console.error('[getListings] search rows error', { code: rowsErr.code })
        return { listings: [], totalCount: 0, error: 'rows_failed' }
      }

      const { data: countResult, error: countErr } = await supabase.rpc(
        'search_listings_count',
        {
          p_query: filters.q.trim(),
          p_category_id: filters.categoryId ?? null,
          p_county_id: filters.countyId ?? null,
          p_condition: filters.condition ?? null,
        } as any,
      )
      if (countErr) {
        console.error('[getListings] search count error', { code: countErr.code })
        return { listings: [], totalCount: 0, error: 'count_failed' }
      }

      // Fetch images and profile details for the returned listing IDs
      const listingIds = (rows ?? []).map((r) => r.id)
      let enriched: ListingRow[] = []
      if (listingIds.length > 0) {
        enriched = await enrichListings(supabase, listingIds, rows as unknown as ListingRow[])
      }

      return {
        listings: enriched,
        totalCount: countResult ?? 0,
        error: null,
      }
    }

    // Plain query without search text
    const buildCount = () => {
      let q = supabase
        .from('listings')
        .select('id', { head: true, count: 'exact' })
        .eq('status', 'active')
      if (filters.categoryId != null) q = q.eq('category_id', filters.categoryId!)
      if (filters.countyId != null) q = q.eq('county_id', filters.countyId!)
      if (filters.condition != null) q = q.eq('condition', filters.condition!)
      return q
    }

    const buildRows = () => {
      let q = supabase
        .from('listings')
        .select(
          `id, profile_id, title, description, condition, trade_terms, price_estimate, status, created_at,
           profiles!inner(id, display_name, username, avatar_url),
           counties!left(name),
           categories!left(name)`,
        )
        .eq('status', 'active')
      if (filters.categoryId != null) q = q.eq('category_id', filters.categoryId!)
      if (filters.countyId != null) q = q.eq('county_id', filters.countyId!)
      if (filters.condition != null) q = q.eq('condition', filters.condition!)
      return q
        .order('created_at', { ascending: false })
        .range(
          (filters.page - 1) * PAGE_SIZE,
          filters.page * PAGE_SIZE - 1,
        )
    }

    const [countResult, rowsResult] = await Promise.all([
      buildCount(),
      buildRows(),
    ])

    console.log('[getListings] countResult', { count: countResult.count, countError: countResult.error })
    console.log('[getListings] rowsResult', { rowsLen: rowsResult.data?.length, rowsError: rowsResult.error })
    if (countResult.error) {
      console.error('[getListings] count error', { code: countResult.error.code })
      return { listings: [], totalCount: 0, error: 'count_failed' }
    }
    if (rowsResult.error) {
      console.error('[getListings] rows error', { code: rowsResult.error.code })
      return { listings: [], totalCount: 0, error: 'rows_failed' }
    }

    const listingIds = (rowsResult.data ?? []).map((r) => r.id)
    let enriched: ListingRow[] = []
    if (listingIds.length > 0) {
      enriched = await enrichListings(supabase, listingIds, rowsResult.data as unknown as ListingRow[])
    }

    return {
      listings: enriched,
      totalCount: countResult.count ?? 0,
      error: null,
    }
  } catch (err) {
    console.error('[getListings] unexpected', err)
    return { listings: [], totalCount: 0, error: 'unknown' }
  } finally {
    console.log('[getListings] end')
  }
}

export async function getListingById(id: string): Promise<ListingRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select(
      `id, profile_id, title, description, condition, trade_terms, price_estimate, status, created_at,
       profiles!inner(id, display_name, username, avatar_url),
       counties!left(name),
       categories!left(name)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getListingById] error', { code: error.code })
    return null
  }
  if (!data) return null

  const enriched = await enrichListings(supabase, [data.id], [data as unknown as ListingRow])
  return enriched[0] ?? null
}

export async function getMyListings(profileId: string): Promise<ListingRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select(
      `id, profile_id, title, description, condition, trade_terms, price_estimate, status, created_at,
       counties!left(name),
       categories!left(name)`,
    )
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMyListings] error', { code: error.code })
    return []
  }

  const listingIds = (data ?? []).map((r) => r.id)
  if (listingIds.length === 0) return []

  const enriched = await enrichListings(supabase, listingIds, data as unknown as ListingRow[])
  return enriched
}

// ============================================================================
// enrichListings — fetch images for a batch of listings and merge them in
// ============================================================================
async function enrichListings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingIds: string[],
  rows: ListingRow[],
): Promise<ListingRow[]> {
  const { data: images, error: imagesErr } = await supabase
    .from('listing_images')
    .select('id, listing_id, url, sort_order')
    .in('listing_id', listingIds)
    .order('sort_order', { ascending: true })

  if (imagesErr) {
    console.error('[enrichListings] images error', { code: imagesErr.code })
  }

  const imagesByListing: Record<string, { id: string; url: string; sort_order: number }[]> = {}
  for (const img of (images ?? [])) {
    if (!imagesByListing[img.listing_id]) imagesByListing[img.listing_id] = []
    imagesByListing[img.listing_id].push({
      id: img.id,
      url: img.url,
      sort_order: img.sort_order,
    })
  }

  return rows.map((row) => ({
    ...row,
    images: imagesByListing[row.id] ?? [],
  }))
}

export { PAGE_SIZE }
