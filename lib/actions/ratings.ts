'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { RatingSchema } from '@/lib/schemas/ratings'
import { captureEvent } from '@/lib/analytics'
import { limitSubmitRating } from '@/lib/rate-limit'
import { validateAndSanitize } from '@/lib/utils/validation'
import { createLogger } from '@/lib/utils/logger'
import type { SubmitRatingResult } from '@/lib/actions/ratings.types'

export async function submitRating(
  _prev: SubmitRatingResult | null,
  formData: FormData,
): Promise<SubmitRatingResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const rateLimit = await limitSubmitRating(user.id)
  if (!rateLimit.success) {
    return { ok: false, error: 'Rate limit exceeded. Try again later.' }
  }

  const parsed = validateAndSanitize(RatingSchema, {
    rateeProfileId: formData.get('rateeProfileId'),
    listingId: formData.get('listingId') || undefined,
    score: Number(formData.get('score')),
    reviewText: formData.get('reviewText') ?? '',
  })
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    }
  }
  const values = parsed.data

  // Get rater profile id
  const { data: raterProfile, error: raterErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (raterErr || !raterProfile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Self-rating guard
  if (raterProfile.id === values.rateeProfileId) {
    return { ok: false, error: "You can't rate yourself." }
  }

  // Check for existing rating on same listing
  if (values.listingId) {
    const { data: existing, error: existingErr } = await supabase
      .from('ratings')
      .select('id')
      .eq('rater_profile_id', raterProfile.id)
      .eq('ratee_profile_id', values.rateeProfileId)
      .eq('listing_id', values.listingId)
      .maybeSingle()
    if (existingErr) {
      const log = createLogger('ratings')
      log.error('existing check failed', { error: existingErr, context: { code: existingErr.code } })
      return { ok: false, error: 'Something went wrong.' }
    }
    if (existing) {
      return { ok: false, error: 'You have already rated this transaction.' }
    }
  }

  const { error: insertErr } = await supabase.from('ratings').insert({
    rater_profile_id: raterProfile.id,
    ratee_profile_id: values.rateeProfileId,
    listing_id: values.listingId ?? null,
    score: values.score,
    review_text: values.reviewText && values.reviewText.trim() !== '' ? values.reviewText.trim() : null,
  })

  if (insertErr) {
    const log = createLogger('ratings')
    log.error('submitRating insert failed', { error: insertErr, context: { code: insertErr.code } })
    return { ok: false, error: 'Something went wrong submitting your rating.' }
  }

  revalidatePath(`/m/${values.rateeProfileId}`)
  revalidatePath('/dashboard/reviews')

  void captureEvent(user.id, 'rating_submitted', {
    ratee_profile_id: values.rateeProfileId,
    listing_id: values.listingId ?? null,
    score: values.score,
  })

  return { ok: true }
}
