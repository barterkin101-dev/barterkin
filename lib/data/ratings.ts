import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'

export interface RatingRow {
  id: string
  score: number
  review_text: string | null
  created_at: string
  rater: {
    id: string
    display_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export async function getRatingsForProfile(profileId: string): Promise<{
  ratings: RatingRow[]
  avg: number | null
  count: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ratings')
    .select(
      `id, score, review_text, created_at,
       rater:profiles!ratings_rater_profile_id_fkey(id, display_name, username, avatar_url)`,
    )
    .eq('ratee_profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) {
    const log = createLogger('ratings')
    log.error('getRatingsForProfile error', { context: { code: error.code } })
    return { ratings: [], avg: null, count: 0 }
  }

  const ratings = (data ?? []).map((r) => ({
    id: r.id,
    score: r.score,
    review_text: r.review_text,
    created_at: r.created_at,
    rater: r.rater as RatingRow['rater'],
  }))

  // Calculate avg locally or use the profiles column
  const { data: profile } = await supabase
    .from('profiles')
    .select('rating_avg, rating_count')
    .eq('id', profileId)
    .maybeSingle()

  return {
    ratings,
    avg: profile?.rating_avg ?? null,
    count: profile?.rating_count ?? 0,
  }
}

export async function getMyRatings(profileId: string): Promise<{
  given: RatingRow[]
  received: RatingRow[]
}> {
  const supabase = await createClient()

  const [{ data: given }, { data: received }] = await Promise.all([
    supabase
      .from('ratings')
      .select(
        `id, score, review_text, created_at,
         ratee:profiles!ratings_ratee_profile_id_fkey(id, display_name, username, avatar_url)`,
      )
      .eq('rater_profile_id', profileId)
      .order('created_at', { ascending: false }),
    supabase
      .from('ratings')
      .select(
        `id, score, review_text, created_at,
         rater:profiles!ratings_rater_profile_id_fkey(id, display_name, username, avatar_url)`,
      )
      .eq('ratee_profile_id', profileId)
      .order('created_at', { ascending: false }),
  ])

  return {
    given: (given ?? []).map((r) => ({
      id: r.id,
      score: r.score,
      review_text: r.review_text,
      created_at: r.created_at,
      rater: r.ratee as RatingRow['rater'],
    })),
    received: (received ?? []).map((r) => ({
      id: r.id,
      score: r.score,
      review_text: r.review_text,
      created_at: r.created_at,
      rater: r.rater as RatingRow['rater'],
    })),
  }
}
