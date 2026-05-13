'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import type { SaveListingToggleResult, GetSavedListingsResult } from '@/lib/actions/saved-listings.types'

const log = createLogger('saved-listings')

// ============================================================================
// toggleSaveListing — save or unsave a listing
// ============================================================================
export async function toggleSaveListing(
  _prev: SaveListingToggleResult | null,
  formData: FormData,
): Promise<SaveListingToggleResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  const listingId = String(formData.get('listingId') ?? '')
  if (!listingId) {
    return { ok: false, error: 'Listing ID is required.' }
  }

  // Get user's profile id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  const userId = profile.id

  // Check if already saved
  const { data: existing } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) {
    // Unsave
    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('id', existing.id)

    if (error) {
      log.error('failed to unsave listing', { error: error.message, userId, context: { listingId } })
      return { ok: false, error: 'Failed to unsave listing.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/listings/[id]', 'page')
    return { ok: true, saved: false, listingId }
  }

  // Save
  const { error } = await supabase
    .from('saved_listings')
    .insert({ user_id: userId, listing_id: listingId })

  if (error) {
    log.error('failed to save listing', { error: error.message, userId, context: { listingId } })
    return { ok: false, error: 'Failed to save listing.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/listings/[id]', 'page')
  return { ok: true, saved: true, listingId }
}

// ============================================================================
// getSavedListings — fetch saved listings for the current user
// ============================================================================
export async function getSavedListings(): Promise<GetSavedListingsResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  // Get user's profile id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  const { data, error } = await supabase
    .from('saved_listings')
    .select(`
      id,
      created_at,
      listing:listings (
        id,
        title,
        description,
        status,
        condition,
        price_estimate,
        trade_terms,
        created_at,
        profile_id,
        county_id,
        category_id,
        boosted_until,
        images (id, url, sort_order),
        profiles (id, display_name, username, avatar_url, accepting_contact),
        counties (name),
        categories (name)
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('failed to fetch saved listings', { error: error.message, userId: profile.id })
    return { ok: false, error: 'Failed to fetch saved listings.' }
  }

  return { ok: true, savedListings: (data ?? []) as unknown as GetSavedListingsResult['savedListings'] }
}

// ============================================================================
// isListingSaved — check if current user has saved a specific listing
// ============================================================================
export async function isListingSaved(listingId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) return false

  const { data } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('user_id', profile.id)
    .eq('listing_id', listingId)
    .maybeSingle()

  return !!data
}
