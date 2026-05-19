/**
 * Saved searches server actions
 *
 * SAVED-ACTION-01: create saved search from directory filters
 * SAVED-ACTION-02: delete saved search
 * SAVED-ACTION-03: toggle email alerts
 */
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createSavedSearch,
  deleteSavedSearch,
  toggleSavedSearchAlert,
} from '@/lib/data/saved-searches'
import { captureEvent } from '@/lib/analytics'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('saved-searches-action')

export interface SavedSearchActionResult {
  ok: boolean
  error?: string
  searchId?: string
}

export async function saveSearch(
  _prev: SavedSearchActionResult | null,
  formData: FormData,
): Promise<SavedSearchActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const profileId = String(formData.get('profileId') ?? '')
  const query = String(formData.get('query') ?? '') || null
  const categoryIdRaw = String(formData.get('categoryId') ?? '')
  const countyIdRaw = String(formData.get('countyId') ?? '')

  if (!profileId) {
    return { ok: false, error: 'Profile ID is required.' }
  }

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile || profile.id !== profileId) {
    return { ok: false, error: 'Unauthorized.' }
  }

  const categoryId = categoryIdRaw ? Number.parseInt(categoryIdRaw, 10) : null
  const countyId = countyIdRaw ? Number.parseInt(countyIdRaw, 10) : null

  const { search, error } = await createSavedSearch(profileId, {
    query,
    categoryId: Number.isFinite(categoryId) ? categoryId : null,
    countyId: Number.isFinite(countyId) ? countyId : null,
  })

  if (error || !search) {
    return { ok: false, error: error ?? 'Failed to save search.' }
  }

  void captureEvent(profileId, 'saved_search_created', {
    query: query ?? undefined,
    category_id: categoryId ?? undefined,
    county_id: countyId ?? undefined,
    search_id: search.id,
  })

  revalidatePath('/dashboard')
  revalidatePath('/directory')
  return { ok: true, searchId: search.id }
}

export async function removeSavedSearch(
  _prev: SavedSearchActionResult | null,
  formData: FormData,
): Promise<SavedSearchActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const searchId = String(formData.get('searchId') ?? '')
  if (!searchId) {
    return { ok: false, error: 'Search ID is required.' }
  }

  const { ok, error } = await deleteSavedSearch(searchId)
  if (!ok) {
    return { ok: false, error: error ?? 'Failed to remove saved search.' }
  }

  void captureEvent(null, 'saved_search_deleted', { search_id: searchId })

  revalidatePath('/dashboard')
  revalidatePath('/directory')
  return { ok: true }
}

export async function toggleSearchAlert(
  _prev: SavedSearchActionResult | null,
  formData: FormData,
): Promise<SavedSearchActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const searchId = String(formData.get('searchId') ?? '')
  const enabledRaw = String(formData.get('enabled') ?? '')
  const enabled = enabledRaw === 'true'

  if (!searchId) {
    return { ok: false, error: 'Search ID is required.' }
  }

  const { ok, error } = await toggleSavedSearchAlert(searchId, enabled)
  if (!ok) {
    return { ok: false, error: error ?? 'Failed to update alert setting.' }
  }

  void captureEvent(null, 'saved_search_alert_toggled', {
    search_id: searchId,
    enabled,
  })

  revalidatePath('/dashboard')
  return { ok: true }
}
