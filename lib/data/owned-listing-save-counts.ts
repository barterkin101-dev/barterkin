import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

export async function getOwnedListingSaveCounts(
  profileId: string,
  listingIds: string[],
): Promise<Record<string, number>> {
  if (listingIds.length === 0) {
    return {}
  }

  const admin = getSupabaseAdmin()
  const log = createLogger('owned-listing-save-counts')

  const { data, error } = await admin
    .from('saved_listings')
    .select('listing_id, listings!inner(profile_id)')
    .in('listing_id', listingIds)
    .eq('listings.profile_id', profileId)

  if (error) {
    log.error('owned listing save counts error', {
      error,
      context: { profileId, listingCount: listingIds.length },
    })
    return {}
  }

  return (data ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.listing_id] = (counts[row.listing_id] ?? 0) + 1
    return counts
  }, {})
}
