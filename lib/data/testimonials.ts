import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

export interface TestimonialRow {
  id: string
  quote: string
  trade_context: string | null
  created_at: string
  profile: {
    id: string
    display_name: string | null
    username: string | null
    avatar_url: string | null
    county_name: string | null
  } | null
}

export interface FeaturedTestimonialsResult {
  testimonials: TestimonialRow[]
  error: string | null
}

/**
 * Get up to 5 featured testimonials for the landing page.
 * Joins with profiles to get display info. Fail-soft.
 */
export async function getFeaturedTestimonials(): Promise<FeaturedTestimonialsResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('testimonials')
      .select(
        `id, quote, trade_context, created_at,
         profile:profiles!testimonials_profile_id_fkey(
           id, display_name, username, avatar_url,
           counties(name)
         )`,
      )
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error

    const testimonials = ((data ?? []) as Array<{
      id: string
      quote: string
      trade_context: string | null
      created_at: string
      profile: {
        id: string
        display_name: string | null
        username: string | null
        avatar_url: string | null
        counties: { name: string } | null
      } | null
    }>).map((row) => ({
      id: row.id,
      quote: row.quote,
      trade_context: row.trade_context,
      created_at: row.created_at,
      profile: row.profile
        ? {
            id: row.profile.id,
            display_name: row.profile.display_name,
            username: row.profile.username,
            avatar_url: row.profile.avatar_url,
            county_name: row.profile.counties?.name ?? null,
          }
        : null,
    }))

    return { testimonials, error: null }
  } catch (err) {
    const log = createLogger('testimonials')
    log.error('getFeaturedTestimonials failed', { error: err })
    return { testimonials: [], error: String(err) }
  }
}

export interface CanSubmitResult {
  canSubmit: boolean
  reason: string | null
}

/**
 * Check if the authenticated member can submit a testimonial.
 * Requirements:
 *  - Profile exists
 *  - Has at least one completed trade (listing status = 'completed')
 *  - Has not already submitted a testimonial
 */
export async function canSubmitTestimonial(userId: string): Promise<CanSubmitResult> {
  try {
    const supabase = await createClient()

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (profileErr) throw profileErr
    if (!profile) return { canSubmit: false, reason: 'Profile not found.' }

    const { data: existing } = await supabase
      .from('testimonials')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (existing) return { canSubmit: false, reason: 'You have already submitted a testimonial.' }

    const { data: completedTrade, error: tradeErr } = await supabase
      .from('listings')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle()

    if (tradeErr) throw tradeErr
    if (!completedTrade) {
      return { canSubmit: false, reason: 'Complete a trade before submitting a testimonial.' }
    }

    return { canSubmit: true, reason: null }
  } catch (err) {
    const log = createLogger('testimonials')
    log.error('canSubmitTestimonial failed', { error: err })
    return { canSubmit: false, reason: 'Something went wrong.' }
  }
}
