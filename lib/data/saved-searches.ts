/**
 * Saved searches data layer
 *
 * SAVED-01: fetch member's saved searches
 * SAVED-02: create a saved search (idempotent — unique index prevents duplicates)
 * SAVED-03: delete a saved search
 * SAVED-04: toggle email_alert_enabled
 * SAVED-05: find matching new listings for alert sends
 */
import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/lib/database.types'

export interface SavedSearchRow {
  id: string
  profile_id: string
  query: string | null
  category_id: number | null
  county_id: number | null
  email_alert_enabled: boolean
  last_alert_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface SavedSearchWithNames extends SavedSearchRow {
  category_name: string | null
  county_name: string | null
}

export interface AlertMatch {
  savedSearchId: string
  profileId: string
  query: string | null
  categoryId: number | null
  countyId: number | null
  listings: AlertListing[]
}

export interface AlertListing {
  id: string
  title: string
  description: string
  category_name: string | null
  county_name: string | null
  seller_display_name: string | null
  seller_username: string | null
  created_at: string
}

const BATCH_SIZE = 100

/**
 * Fetch all saved searches for a given profile.
 */
export async function getSavedSearchesForProfile(
  profileId: string,
): Promise<{ searches: SavedSearchWithNames[]; error: string | null }> {
  const supabase = await createClient()
  const log = createLogger('saved-searches')

  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select(
        'id, profile_id, query, category_id, county_id, email_alert_enabled, last_alert_sent_at, created_at, updated_at, categories(name), counties(name)',
      )
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('Failed to fetch saved searches', { error, context: { profile_id: profileId } })
      return { searches: [], error: 'fetch_failed' }
    }

    const searches = (data ?? []).map((row) => ({
      id: row.id,
      profile_id: row.profile_id,
      query: row.query,
      category_id: row.category_id,
      county_id: row.county_id,
      email_alert_enabled: row.email_alert_enabled,
      last_alert_sent_at: row.last_alert_sent_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_name: (row.categories as { name: string } | null)?.name ?? null,
      county_name: (row.counties as { name: string } | null)?.name ?? null,
    }))

    return { searches, error: null }
  } catch (err) {
    log.error('getSavedSearchesForProfile unexpected error', { error: err, context: { profile_id: profileId } })
    return { searches: [], error: 'unknown' }
  }
}

/**
 * Create a saved search for a profile.
 * Returns the existing row if the same filters already exist (unique index).
 */
export async function createSavedSearch(
  profileId: string,
  filters: {
    query?: string | null
    categoryId?: number | null
    countyId?: number | null
  },
): Promise<{ search: SavedSearchRow | null; error: string | null }> {
  const supabase = await createClient()
  const log = createLogger('saved-searches')

  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        profile_id: profileId,
        query: filters.query ?? null,
        category_id: filters.categoryId ?? null,
        county_id: filters.countyId ?? null,
      })
      .select('id, profile_id, query, category_id, county_id, email_alert_enabled, last_alert_sent_at, created_at, updated_at')
      .single()

    if (error) {
      // Unique violation = already exists, fetch it
      if (error.code === '23505') {
        const { data: existing, error: fetchErr } = await supabase
          .from('saved_searches')
          .select('id, profile_id, query, category_id, county_id, email_alert_enabled, last_alert_sent_at, created_at, updated_at')
          .eq('profile_id', profileId)
          .eq('query', filters.query ?? '')
          .eq('category_id', filters.categoryId ?? 0)
          .eq('county_id', filters.countyId ?? 0)
          .maybeSingle()

        if (fetchErr || !existing) {
          log.error('Failed to fetch existing saved search after unique violation', {
            error: fetchErr,
            context: { profile_id: profileId },
          })
          return { search: null, error: 'duplicate_fetch_failed' }
        }
        return { search: existing as SavedSearchRow, error: null }
      }

      log.error('Failed to create saved search', { error, context: { profile_id: profileId } })
      return { search: null, error: 'insert_failed' }
    }

    return { search: data as SavedSearchRow, error: null }
  } catch (err) {
    log.error('createSavedSearch unexpected error', { error: err, context: { profile_id: profileId } })
    return { search: null, error: 'unknown' }
  }
}

/**
 * Delete a saved search by ID. Verifies ownership via RLS.
 */
export async function deleteSavedSearch(
  searchId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const log = createLogger('saved-searches')

  try {
    const { error } = await supabase.from('saved_searches').delete().eq('id', searchId)

    if (error) {
      log.error('Failed to delete saved search', { error, context: { search_id: searchId } })
      return { ok: false, error: 'delete_failed' }
    }

    return { ok: true, error: null }
  } catch (err) {
    log.error('deleteSavedSearch unexpected error', { error: err, context: { search_id: searchId } })
    return { ok: false, error: 'unknown' }
  }
}

/**
 * Toggle email_alert_enabled for a saved search.
 */
export async function toggleSavedSearchAlert(
  searchId: string,
  enabled: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const log = createLogger('saved-searches')

  try {
    const { error } = await supabase
      .from('saved_searches')
      .update({ email_alert_enabled: enabled })
      .eq('id', searchId)

    if (error) {
      log.error('Failed to toggle saved search alert', { error, context: { search_id: searchId, enabled } })
      return { ok: false, error: 'update_failed' }
    }

    return { ok: true, error: null }
  } catch (err) {
    log.error('toggleSavedSearchAlert unexpected error', { error: err, context: { search_id: searchId } })
    return { ok: false, error: 'unknown' }
  }
}

/**
 * Fetch all saved searches with alerts enabled that haven't been alerted today.
 * Uses admin client for cron jobs.
 */
export async function getAlertEligibleSearches(): Promise<{
  searches: SavedSearchRow[]
  error: string | null
}> {
  const admin = getSupabaseAdmin()
  const log = createLogger('saved-searches')

  try {
    const { data, error } = await admin
      .from('saved_searches')
      .select('id, profile_id, query, category_id, county_id, email_alert_enabled, last_alert_sent_at, created_at, updated_at')
      .eq('email_alert_enabled', true)
      .limit(BATCH_SIZE)

    if (error) {
      log.error('Failed to fetch alert-eligible searches', { error })
      return { searches: [], error: 'fetch_failed' }
    }

    const raw = (data ?? []) as SavedSearchRow[]

    // Filter out those already alerted today
    const searchIds = raw.map((s) => s.id)
    if (searchIds.length === 0) {
      return { searches: [], error: null }
    }

    const { data: recentAlerts } = await admin
      .from('listing_alerts')
      .select('saved_search_id')
      .in('saved_search_id', searchIds)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const alertedToday = new Set((recentAlerts ?? []).map((a) => a.saved_search_id))
    const searches = raw.filter((s) => !alertedToday.has(s.id))

    return { searches, error: null }
  } catch (err) {
    log.error('getAlertEligibleSearches unexpected error', { error: err })
    return { searches: [], error: 'unknown' }
  }
}

/**
 * Find new listings created in the last 24h that match a saved search's filters.
 */
export async function getNewListingsForSavedSearch(
  search: SavedSearchRow,
): Promise<{ listings: AlertListing[]; error: string | null }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('saved-searches')

  try {
    let q = admin
      .from('listings')
      .select(
        'id, title, description, created_at, categories(name), counties(name), profiles(display_name, username)',
      )
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (search.category_id !== null) {
      q = q.eq('category_id', search.category_id)
    }
    if (search.county_id !== null) {
      q = q.eq('county_id', search.county_id)
    }
    if (search.query && search.query.trim()) {
      q = q.textSearch('search_vector', search.query.trim(), {
        type: 'plain',
        config: 'english',
      })
    }

    const { data, error } = await q.order('created_at', { ascending: false }).limit(10)

    if (error) {
      log.error('Failed to fetch new listings for saved search', {
        error,
        context: { search_id: search.id, code: error.code },
      })
      return { listings: [], error: 'query_failed' }
    }

    const listings = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      created_at: row.created_at,
      category_name: (row.categories as { name: string } | null)?.name ?? null,
      county_name: (row.counties as { name: string } | null)?.name ?? null,
      seller_display_name: (row.profiles as { display_name: string | null; username: string | null } | null)?.display_name ?? null,
      seller_username: (row.profiles as { display_name: string | null; username: string | null } | null)?.username ?? null,
    }))

    return { listings, error: null }
  } catch (err) {
    log.error('getNewListingsForSavedSearch unexpected error', { error: err, context: { search_id: search.id } })
    return { listings: [], error: 'unknown' }
  }
}

/**
 * Record that an alert was sent for a saved search.
 */
export async function recordAlertSent(
  savedSearchId: string,
  profileId: string,
  listingsCount: number,
): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  const log = createLogger('saved-searches')

  try {
    const { error } = await admin.from('listing_alerts').insert({
      saved_search_id: savedSearchId,
      profile_id: profileId,
      listings_count: listingsCount,
    })

    if (error) {
      // Unique violation = already alerted today, treat as non-error
      if (error.code === '23505') {
        return { ok: true }
      }
      log.error('Failed to record alert sent', { error, context: { saved_search_id: savedSearchId } })
      return { ok: false, error: error.message }
    }

    // Update last_alert_sent_at on the saved search
    await admin
      .from('saved_searches')
      .update({ last_alert_sent_at: new Date().toISOString() })
      .eq('id', savedSearchId)

    return { ok: true }
  } catch (err) {
    log.error('recordAlertSent unexpected error', { error: err, context: { saved_search_id: savedSearchId } })
    return { ok: false, error: 'unknown' }
  }
}
