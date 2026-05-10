'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ListingFormSchema } from '@/lib/schemas/listings'
import { captureEvent } from '@/lib/analytics'
import { limitCreateListing } from '@/lib/rate-limit'
import { validateAndSanitize } from '@/lib/utils/validation'
import type {
  SaveListingResult,
  DeleteListingResult,
  ToggleListingStatusResult,
} from '@/lib/actions/listings.types'

// ============================================================================
// coerceFormDataToListingInput — parse FormData into typed input
// ============================================================================
function coerceFormDataToListingInput(formData: FormData): {
  title: string
  description: string
  categoryId: number | null
  countyId: number | null
  condition: string | null
  tradeTerms: string
  priceEstimate: string
  images: string[]
} {
  const rawCategoryId = formData.get('categoryId')
  const rawCountyId = formData.get('countyId')
  const rawCondition = formData.get('condition')
  const rawImages = formData.get('images')

  return {
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    categoryId:
      rawCategoryId && String(rawCategoryId) !== ''
        ? Number(rawCategoryId)
        : null,
    countyId:
      rawCountyId && String(rawCountyId) !== ''
        ? Number(rawCountyId)
        : null,
    condition:
      rawCondition && String(rawCondition) !== ''
        ? String(rawCondition)
        : null,
    tradeTerms: String(formData.get('tradeTerms') ?? ''),
    priceEstimate: String(formData.get('priceEstimate') ?? ''),
    images: rawImages ? (JSON.parse(String(rawImages)) as string[]) : [],
  }
}

// ============================================================================
// saveListing — create or update a listing (LIST-01..LIST-12)
// ============================================================================
export async function saveListing(
  _prev: SaveListingResult | null,
  formData: FormData,
): Promise<SaveListingResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const input = coerceFormDataToListingInput(formData)
  const parsed = validateAndSanitize(ListingFormSchema, input)
  if (!parsed.ok) {
    console.error('[saveListing] validation failed', {
      fieldErrors: parsed.fieldErrors ? Object.keys(parsed.fieldErrors) : [],
    })
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    }
  }
  const values = parsed.data

  // Fetch profile id
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    console.error('[saveListing] profile lookup failed', { code: profileErr?.code })
    return { ok: false, error: 'Profile not found. Complete onboarding first.' }
  }

  const listingId = formData.get('listingId')
  const isUpdate = listingId && String(listingId) !== ''

  // Rate limit on create only
  if (!isUpdate) {
    const limit = await limitCreateListing(user.id)
    if (!limit.success) {
      return { ok: false, error: 'Rate limit exceeded. Try again later.' }
    }
  }

  // If updating, verify ownership
  if (isUpdate) {
    const { data: existing, error: existingErr } = await supabase
      .from('listings')
      .select('id, profile_id')
      .eq('id', String(listingId))
      .maybeSingle()
    if (existingErr || !existing) {
      return { ok: false, error: 'Listing not found.' }
    }
    if (existing.profile_id !== profile.id) {
      return { ok: false, error: 'You can only edit your own listings.' }
    }
  }

  // Upsert listing
  const { data: listing, error: upsertErr } = await supabase
    .from('listings')
    .upsert({
      id: isUpdate ? String(listingId) : undefined,
      profile_id: profile.id,
      title: values.title,
      description: values.description,
      category_id: values.categoryId,
      county_id: values.countyId,
      condition: values.condition,
      trade_terms: values.tradeTerms && values.tradeTerms.trim() !== '' ? values.tradeTerms.trim() : null,
      price_estimate: values.priceEstimate && values.priceEstimate.trim() !== '' ? values.priceEstimate.trim() : null,
    })
    .select('id')
    .single()
  if (upsertErr || !listing) {
    console.error('[saveListing] upsert failed', { code: upsertErr?.code })
    return { ok: false, error: 'Something went wrong saving your listing.' }
  }

  // Sync images: delete existing, insert new (in order)
  const { error: deleteImagesErr } = await supabase
    .from('listing_images')
    .delete()
    .eq('listing_id', listing.id)
  if (deleteImagesErr) {
    console.error('[saveListing] image delete failed', { code: deleteImagesErr.code })
  }

  if (values.images.length > 0) {
    const imageRows = values.images.map((url, i) => ({
      listing_id: listing.id,
      url,
      sort_order: i,
    }))
    const { error: insertImagesErr } = await supabase
      .from('listing_images')
      .insert(imageRows)
    if (insertImagesErr) {
      console.error('[saveListing] image insert failed', { code: insertImagesErr.code })
    }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath(`/listings/${listing.id}`)

  void captureEvent(user.id, isUpdate ? 'listing_updated' : 'listing_created', {
    listing_id: listing.id,
    has_images: values.images.length,
  })

  return { ok: true, listingId: listing.id }
}

// Simple wrapper for direct form use (no useActionState)
export async function deleteListingForm(formData: FormData): Promise<void> {
  await deleteListing(null, formData)
}

export async function toggleListingStatusForm(formData: FormData): Promise<void> {
  await toggleListingStatus(null, formData)
}

// ============================================================================
// deleteListing — soft-delete by setting status to cancelled
// ============================================================================
export async function deleteListing(
  _prev: DeleteListingResult | null,
  formData: FormData,
): Promise<DeleteListingResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const listingId = String(formData.get('listingId') ?? '')
  if (!listingId) return { ok: false, error: 'Listing ID is required.' }

  // Fetch profile id
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Verify ownership
  const { data: existing, error: existingErr } = await supabase
    .from('listings')
    .select('id, profile_id')
    .eq('id', listingId)
    .maybeSingle()
  if (existingErr || !existing) {
    return { ok: false, error: 'Listing not found.' }
  }
  if (existing.profile_id !== profile.id) {
    return { ok: false, error: 'You can only delete your own listings.' }
  }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'cancelled' })
    .eq('id', listingId)
  if (error) {
    console.error('[deleteListing] update failed', { code: error.code })
    return { ok: false, error: 'Something went wrong deleting your listing.' }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
  return { ok: true }
}

// ============================================================================
// toggleListingStatus — active <-> paused
// ============================================================================
export async function toggleListingStatus(
  _prev: ToggleListingStatusResult | null,
  formData: FormData,
): Promise<ToggleListingStatusResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const listingId = String(formData.get('listingId') ?? '')
  const newStatus = String(formData.get('status') ?? '')
  if (!listingId || !['active', 'paused'].includes(newStatus)) {
    return { ok: false, error: 'Invalid request.' }
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  const { data: existing, error: existingErr } = await supabase
    .from('listings')
    .select('id, profile_id, status')
    .eq('id', listingId)
    .maybeSingle()
  if (existingErr || !existing) {
    return { ok: false, error: 'Listing not found.' }
  }
  if (existing.profile_id !== profile.id) {
    return { ok: false, error: 'You can only edit your own listings.' }
  }

  const { error } = await supabase
    .from('listings')
    .update({ status: newStatus })
    .eq('id', listingId)
  if (error) {
    console.error('[toggleListingStatus] update failed', { code: error.code })
    return { ok: false, error: 'Something went wrong updating your listing.' }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath(`/listings/${listingId}`)
  return { ok: true }
}
