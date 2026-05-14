/**
 * Discover feed — algorithmic listing surfacing for the dashboard.
 *
 * Uses the `discover_listings` SQL function which ranks by:
 *   1. Skills match (ts_rank of listing vs user's skills_offered + skills_wanted)
 *   2. County proximity (+0.30 if same county)
 *   3. Recency boost (×2.0 if created within 7 days)
 *   4. Social signal (+0.10 per conversation, capped at 0.50)
 *
 * FEED-01 (algorithmic ranking), FEED-02 (exclude own listings).
 */
import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import type { ListingRow, ListingImage } from '@/lib/data/listings.types'

const DISCOVER_LIMIT = 12

export interface DiscoverResult {
  listings: ListingRow[]
  error: string | null
}

export async function getDiscoverFeed(profileId: string): Promise<DiscoverResult> {
  const supabase = await createClient()

  try {
    const { data: rows, error: rowsErr } = await supabase.rpc('discover_listings', {
      p_viewer_profile_id: profileId,
      p_limit: DISCOVER_LIMIT,
    })

    if (rowsErr) {
      const log = createLogger('discover')
      log.error('discover_listings error', { error: rowsErr, context: { code: rowsErr.code } })
      return { listings: [], error: 'discover_failed' }
    }

    const rawRows = (rows ?? []) as Array<{
      id: string
      profile_id: string
      title: string
      description: string
      category_id: number | null
      county_id: number | null
      condition: string | null
      trade_terms: string | null
      status: string
      price_estimate: string | null
      created_at: string
      featured_until: string | null
      score: number
    }>

    if (rawRows.length === 0) {
      return { listings: [], error: null }
    }

    // Fetch images for the batch
    const listingIds = rawRows.map((r) => r.id)
    const { data: images, error: imagesErr } = await supabase
      .from('listing_images')
      .select('id, listing_id, url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true })

    if (imagesErr) {
      const log = createLogger('discover')
      log.warn('discover images error', { context: { code: imagesErr.code } })
    }

    const imagesByListing: Record<string, ListingImage[]> = {}
    for (const img of (images ?? [])) {
      if (!imagesByListing[img.listing_id]) imagesByListing[img.listing_id] = []
      imagesByListing[img.listing_id].push({
        id: img.id,
        url: img.url,
        sort_order: img.sort_order,
      })
    }

    // Fetch profile details for sellers
    const sellerIds = Array.from(new Set(rawRows.map((r) => r.profile_id)))
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', sellerIds)

    if (profilesErr) {
      const log = createLogger('discover')
      log.warn('discover profiles error', { context: { code: profilesErr.code } })
    }

    const profileMap: Record<string, { id: string; display_name: string | null; username: string | null; avatar_url: string | null }> = {}
    for (const p of (profiles ?? [])) {
      profileMap[p.id] = p
    }

    // Fetch county + category names
    const countyIds = Array.from(new Set(rawRows.map((r) => r.county_id).filter((x): x is number => x != null)))
    const categoryIds = Array.from(new Set(rawRows.map((r) => r.category_id).filter((x): x is number => x != null)))

    const [{ data: counties }, { data: categories }] = await Promise.all([
      countyIds.length > 0
        ? supabase.from('counties').select('id, name').in('id', countyIds)
        : Promise.resolve({ data: [] }),
      categoryIds.length > 0
        ? supabase.from('categories').select('id, name').in('id', categoryIds)
        : Promise.resolve({ data: [] }),
    ])

    const countyMap: Record<number, string> = {}
    for (const c of (counties ?? [])) countyMap[c.id] = c.name
    const categoryMap: Record<number, string> = {}
    for (const c of (categories ?? [])) categoryMap[c.id] = c.name

    const listings: ListingRow[] = rawRows.map((row) => ({
      id: row.id,
      profile_id: row.profile_id,
      title: row.title,
      description: row.description,
      condition: row.condition,
      trade_terms: row.trade_terms,
      price_estimate: row.price_estimate,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.created_at,
      featured_until: row.featured_until,
      boosted_until: null,
      images: imagesByListing[row.id] ?? [],
      profiles: profileMap[row.profile_id]
        ? {
            id: profileMap[row.profile_id].id,
            display_name: profileMap[row.profile_id].display_name,
            username: profileMap[row.profile_id].username,
            avatar_url: profileMap[row.profile_id].avatar_url,
            accepting_contact: null,
            phone_verified: false,
          }
        : null,
      counties: row.county_id != null ? { name: countyMap[row.county_id] ?? 'Georgia' } : null,
      categories: row.category_id != null ? { name: categoryMap[row.category_id] ?? '' } : null,
      category_id: row.category_id,
      county_id: row.county_id,
    }))

    return { listings, error: null }
  } catch (err) {
    const log = createLogger('discover')
    log.error('getDiscoverFeed unexpected error', { error: err })
    return { listings: [], error: 'unknown' }
  }
}
