'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ListingFormSchema } from '@/lib/schemas/listings'
import { captureEvent } from '@/lib/analytics'
import { limitCreateListing } from '@/lib/rate-limit'
import { validateAndSanitize } from '@/lib/utils/validation'
import { createLogger } from '@/lib/utils/logger'
import { awardQuest } from '@/lib/actions/quests'
import { FREE_LISTING_LIMIT } from '@/lib/listing-limits'
import type {
  SaveListingResult,
  DeleteListingResult,
  ToggleListingStatusResult,
  BoostListingResult,
  FeatureListingResult,
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
    const log = createLogger('listings')
    log.warn('validation failed', {
      context: { fieldErrors: Object.keys(parsed.fieldErrors ?? {}) },
    })
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    }
  }
  const values = parsed.data

  // Fetch profile id + tier for listing limits
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, tier')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    const log = createLogger('listings')
    log.error('profile lookup failed', { error: profileErr, context: { code: profileErr?.code } })
    return { ok: false, error: 'Profile not found. Complete onboarding first.' }
  }

  const listingId = formData.get('listingId')
  const isUpdate = listingId && String(listingId) !== ''
  let shouldAwardFirstListingQuest = false

  // Tier-based listing limits: free = 3 max, premium/founding = unlimited
  if (!isUpdate) {
    const { count: priorListingCount, error: priorListingCountErr } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)

    if (priorListingCountErr) {
      const log = createLogger('listings')
      log.error('prior listing count failed', {
        error: priorListingCountErr,
        context: { code: priorListingCountErr.code },
      })
      return { ok: false, error: 'Something went wrong saving your listing.' }
    }

    shouldAwardFirstListingQuest = (priorListingCount ?? 0) === 0
  }

  if (!isUpdate && profile.tier === 'free') {
    const { count, error: countErr } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .neq('status', 'cancelled')
    if (countErr) {
      const log = createLogger('listings')
      log.error('listing count failed', { error: countErr, context: { code: countErr.code } })
    }
    if ((count ?? 0) >= FREE_LISTING_LIMIT) {
      return {
        ok: false,
        error: `Free members can create up to ${FREE_LISTING_LIMIT} listings. Upgrade to Premium for unlimited listings.`,
      }
    }
  }

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
    const log = createLogger('listings')
    log.error('upsert failed', { error: upsertErr, context: { code: upsertErr?.code } })
    return { ok: false, error: 'Something went wrong saving your listing.' }
  }

  // Sync images: delete existing, insert new (in order)
  const { error: deleteImagesErr } = await supabase
    .from('listing_images')
    .delete()
    .eq('listing_id', listing.id)
  if (deleteImagesErr) {
    const log = createLogger('listings')
    log.warn('image delete failed', { error: deleteImagesErr, context: { code: deleteImagesErr.code } })
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
      const log = createLogger('listings')
      log.warn('image insert failed', { error: insertImagesErr, context: { code: insertImagesErr.code } })
    }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath(`/listings/${listing.id}`)

  void captureEvent(user.id, isUpdate ? 'listing_updated' : 'listing_created', {
    listing_id: listing.id,
    has_images: values.images.length,
  })

  if (!isUpdate && shouldAwardFirstListingQuest) {
    const questResult = await awardQuest('quest_first_listing')
    if (!questResult.ok) {
      const log = createLogger('listings')
      log.warn('quest_first_listing award failed', {
        context: { listingId: listing.id, error: questResult.error },
      })
    }
    if (questResult.ok && questResult.awarded) {
      void captureEvent(user.id, 'first_listing_created', {
        listing_id: listing.id,
        credits: questResult.credits,
      })
    }
  }

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
    const log = createLogger('listings')
    log.error('delete update failed', { error, context: { code: error.code } })
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
    const log = createLogger('listings')
    log.error('toggle status update failed', { error, context: { code: error.code } })
    return { ok: false, error: 'Something went wrong updating your listing.' }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath(`/listings/${listingId}`)
  return { ok: true }
}

// ============================================================================
// boostListing — spend 1 credit to feature a listing for 7 days
// ============================================================================
const BOOST_COST = 1
const BOOST_DURATION_DAYS = 7
const FEATURE_COST = 5
const FEATURE_DURATION_DAYS = 7

export async function boostListing(
  _prev: BoostListingResult | null,
  formData: FormData,
): Promise<BoostListingResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const listingId = String(formData.get('listingId') ?? '')
  if (!listingId) return { ok: false, error: 'Listing ID is required.' }

  // Fetch profile id + credits
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, credits')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  if ((profile.credits ?? 0) < BOOST_COST) {
    return { ok: false, error: `You need ${BOOST_COST} credit to boost a listing. Earn credits by inviting friends.` }
  }

  // Verify ownership
  const { data: existing, error: existingErr } = await supabase
    .from('listings')
    .select('id, profile_id, status, boosted_until')
    .eq('id', listingId)
    .maybeSingle()
  if (existingErr || !existing) {
    return { ok: false, error: 'Listing not found.' }
  }
  if (existing.profile_id !== profile.id) {
    return { ok: false, error: 'You can only boost your own listings.' }
  }
  if (existing.status !== 'active') {
    return { ok: false, error: 'Only active listings can be boosted.' }
  }

  // Check if already boosted
  const now = new Date()
  if (existing.boosted_until && new Date(existing.boosted_until) > now) {
    return { ok: false, error: 'This listing is already boosted.' }
  }

  // Atomically: deduct credit + set boosted_until
  const boostedUntil = new Date(now.getTime() + BOOST_DURATION_DAYS * 24 * 60 * 60 * 1000)

  // Deduct credit via ledger (triggers profiles.credits update)
  const { error: ledgerErr } = await supabase
    .from('credit_ledger')
    .insert({
      profile_id: profile.id,
      amount: -BOOST_COST,
      reason: 'listing_boost',
    })
  if (ledgerErr) {
    const log = createLogger('listings')
    log.error('boost credit deduction failed', { error: ledgerErr, context: { code: ledgerErr.code } })
    return { ok: false, error: 'Could not deduct credits. Please try again.' }
  }

  // Set boosted_until
  const { error: updateErr } = await supabase
    .from('listings')
    .update({ boosted_until: boostedUntil.toISOString() })
    .eq('id', listingId)
  if (updateErr) {
    const log = createLogger('listings')
    log.error('boost update failed', { error: updateErr, context: { code: updateErr.code } })
    return { ok: false, error: 'Something went wrong boosting your listing.' }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath(`/listings/${listingId}`)

  void captureEvent(user.id, 'listing_boosted', {
    listing_id: listingId,
    cost: BOOST_COST,
    duration_days: BOOST_DURATION_DAYS,
  })

  return { ok: true, boostedUntil: boostedUntil.toISOString() }
}

export async function featureListing(
  _prev: FeatureListingResult | null,
  formData: FormData,
): Promise<FeatureListingResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const listingId = String(formData.get('listingId') ?? '')
  if (!listingId) return { ok: false, error: 'Listing ID is required.' }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, tier, credits')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  if (profile.tier !== 'premium') {
    return { ok: false, error: 'Only Premium members can feature listings.' }
  }

  if ((profile.credits ?? 0) < FEATURE_COST) {
    return {
      ok: false,
      error: `You need ${FEATURE_COST} credits to feature a listing for ${FEATURE_DURATION_DAYS} days.`,
    }
  }

  const { data: existing, error: existingErr } = await supabase
    .from('listings')
    .select('id, profile_id, status, featured_until')
    .eq('id', listingId)
    .maybeSingle()
  if (existingErr || !existing) {
    return { ok: false, error: 'Listing not found.' }
  }
  if (existing.profile_id !== profile.id) {
    return { ok: false, error: 'You can only feature your own listings.' }
  }
  if (existing.status !== 'active') {
    return { ok: false, error: 'Only active listings can be featured.' }
  }

  const now = new Date()
  if (existing.featured_until && new Date(existing.featured_until) > now) {
    return { ok: false, error: 'This listing is already featured.' }
  }

  const featuredUntil = new Date(now.getTime() + FEATURE_DURATION_DAYS * 24 * 60 * 60 * 1000)

  const { error: ledgerErr } = await supabase
    .from('credit_ledger')
    .insert({
      profile_id: profile.id,
      amount: -FEATURE_COST,
      reason: 'listing_feature',
    })
  if (ledgerErr) {
    const log = createLogger('listings')
    log.error('feature credit deduction failed', { error: ledgerErr, context: { code: ledgerErr.code } })
    return { ok: false, error: 'Could not deduct credits. Please try again.' }
  }

  const { error: updateErr } = await supabase
    .from('listings')
    .update({ featured_until: featuredUntil.toISOString() })
    .eq('id', listingId)
  if (updateErr) {
    const log = createLogger('listings')
    log.error('feature update failed', { error: updateErr, context: { code: updateErr.code } })
    return { ok: false, error: 'Something went wrong featuring your listing.' }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath('/listings')
  revalidatePath(`/listings/${listingId}`)

  void captureEvent(user.id, 'listing_featured', {
    listing_id: listingId,
    cost: FEATURE_COST,
    duration_days: FEATURE_DURATION_DAYS,
  })

  return { ok: true, featuredUntil: featuredUntil.toISOString() }
}
