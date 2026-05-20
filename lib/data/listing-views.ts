import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import type { Database } from '@/lib/database.types'

export interface RecentViewRow {
  id: string
  profile_id: string
  listing_id: string
  viewed_at: string
  listings: {
    id: string
    title: string
    description: string | null
    condition: string | null
    trade_terms: string | null
    price_estimate: string | null
    status: string
    created_at: string
    updated_at: string
    featured_until: string | null
    boosted_until: string | null
    counties: { name: string | null } | null
    categories: { name: string | null } | null
    listing_images: { url: string }[] | null
    profiles: {
      id: string
      display_name: string | null
      username: string | null
      avatar_url: string | null
    } | null
  } | null
}

/**
 * Record a listing view for the current member.
 * Uses upsert so repeated views of the same listing update the timestamp.
 */
export async function recordListingView(
  profileId: string,
  listingId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('listing_views')
    .upsert(
      {
        profile_id: profileId,
        listing_id: listingId,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,listing_id' },
    )

  if (error) {
    const log = createLogger('listing-views')
    log.error('recordListingView error', { context: { code: error.code } })
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Fetch the 5 most recently viewed listings for a member.
 * Returns enriched rows with listing details.
 */
export async function getRecentListingViews(
  profileId: string,
  limit = 5,
): Promise<RecentViewRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listing_views')
    .select(
      `id, profile_id, listing_id, viewed_at,
       listings!inner(
         id, title, description, condition, trade_terms, price_estimate, status, created_at, updated_at, featured_until, boosted_until,
         counties!left(name),
         categories!left(name),
         listing_images(url),
         profiles!inner(id, display_name, username, avatar_url)
       )`,
    )
    .eq('profile_id', profileId)
    .order('viewed_at', { ascending: false })
    .limit(limit)

  if (error) {
    const log = createLogger('listing-views')
    log.error('getRecentListingViews error', { context: { code: error.code } })
    return []
  }

  return (data ?? []) as unknown as RecentViewRow[]
}
