'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { TestimonialSchema } from '@/lib/schemas/testimonials'
import { captureEvent } from '@/lib/analytics'
import { validateAndSanitize } from '@/lib/utils/validation'
import { createLogger } from '@/lib/utils/logger'
import type { SubmitTestimonialResult } from '@/lib/actions/testimonials.types'

export async function submitTestimonial(
  _prev: SubmitTestimonialResult | null,
  formData: FormData,
): Promise<SubmitTestimonialResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'Not authenticated.' }

  const parsed = validateAndSanitize(TestimonialSchema, {
    quote: formData.get('quote'),
    tradeContext: formData.get('tradeContext') ?? '',
  })
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    }
  }
  const values = parsed.data

  // Get profile id
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (profileErr || !profile) {
    return { ok: false, error: 'Profile not found.' }
  }

  // Check for existing testimonial
  const { data: existing } = await supabase
    .from('testimonials')
    .select('id')
    .eq('profile_id', profile.id)
    .maybeSingle()
  if (existing) {
    return { ok: false, error: 'You have already submitted a testimonial.' }
  }

  // Check for completed trade
  const { data: completedTrade, error: tradeErr } = await supabase
    .from('listings')
    .select('id')
    .eq('profile_id', profile.id)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle()
  if (tradeErr) {
    const log = createLogger('testimonials')
    log.error('trade completion check failed', { error: tradeErr, context: { code: tradeErr.code } })
    return { ok: false, error: 'Something went wrong.' }
  }
  if (!completedTrade) {
    return { ok: false, error: 'Complete a trade before submitting a testimonial.' }
  }

  const { error: insertErr } = await supabase.from('testimonials').insert({
    profile_id: profile.id,
    quote: values.quote.trim(),
    trade_context: values.tradeContext && values.tradeContext.trim() !== '' ? values.tradeContext.trim() : null,
    is_featured: false,
  })

  if (insertErr) {
    const log = createLogger('testimonials')
    log.error('submitTestimonial insert failed', { error: insertErr, context: { code: insertErr.code } })
    return { ok: false, error: 'Something went wrong submitting your testimonial.' }
  }

  revalidatePath('/')

  void captureEvent(user.id, 'testimonial_submitted', {
    profile_id: profile.id,
  })

  return { ok: true }
}
