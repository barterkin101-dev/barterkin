/**
 * Public county data layer — member counts and listing counts per county.
 *
 * Used by the public /counties page (no auth required).
 */
import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import georgiaCounties from '@/lib/data/georgia-counties.json'

export interface CountyStat {
  fips: number
  name: string
  memberCount: number
  listingCount: number
}

export interface CountyStatsResult {
  counties: CountyStat[]
  totalMembers: number
  totalListings: number
  error: string | null
}

export async function getCountyStats(): Promise<CountyStatsResult> {
  const supabase = await createClient()
  const log = createLogger('counties-public')

  try {
    // Fetch published profile counts per county
    const { data: profileRows, error: profileErr } = await supabase
      .from('profiles')
      .select('county_id')
      .eq('is_published', true)
      .eq('banned', false)

    if (profileErr) {
      log.error('profile count error', { context: { code: profileErr.code } })
      return { counties: [], totalMembers: 0, totalListings: 0, error: 'profiles_failed' }
    }

    // Fetch active listing counts per county
    const { data: listingRows, error: listingErr } = await supabase
      .from('listings')
      .select('county_id')
      .eq('status', 'active')

    if (listingErr) {
      log.error('listing count error', { context: { code: listingErr.code } })
      return { counties: [], totalMembers: 0, totalListings: 0, error: 'listings_failed' }
    }

    // Ensure arrays for safe iteration
    const safeProfileRows = profileRows ?? []
    const safeListingRows = listingRows ?? []

    // Aggregate counts
    const profileCounts = new Map<number, number>()
    for (const row of safeProfileRows) {
      if (row.county_id != null) {
        profileCounts.set(row.county_id, (profileCounts.get(row.county_id) ?? 0) + 1)
      }
    }

    const listingCounts = new Map<number, number>()
    for (const row of safeListingRows) {
      if (row.county_id != null) {
        listingCounts.set(row.county_id, (listingCounts.get(row.county_id) ?? 0) + 1)
      }
    }

    const counties: CountyStat[] = (georgiaCounties as Array<{ fips: number; name: string }>).map(
      (county) => ({
        fips: county.fips,
        name: county.name,
        memberCount: profileCounts.get(county.fips) ?? 0,
        listingCount: listingCounts.get(county.fips) ?? 0,
      }),
    )

    const totalMembers = Array.from(profileCounts.values()).reduce((a, b) => a + b, 0)
    const totalListings = Array.from(listingCounts.values()).reduce((a, b) => a + b, 0)

    return { counties, totalMembers, totalListings, error: null }
  } catch (err) {
    log.error('unexpected error', { error: err })
    return { counties: [], totalMembers: 0, totalListings: 0, error: 'unknown' }
  }
}
