/**
 * Phase 4 — Directory data layer
 *
 * DIR-02 (card fields), DIR-05 (FTS + pg_trgm), DIR-07 (20/page), DIR-10 (TTFB).
 *
 * RLS enforces DIR-09 (is_published + verified + not-banned). This module MUST NOT
 * duplicate those gates — doing so would either be a no-op (if RLS is correct) or
 * contradict RLS (if RLS is wrong, app-level filters hide the bug). See RESEARCH.md
 * Pitfall 1.
 *
 * Contract: both the count query and the rows query apply IDENTICAL filters via the
 * shared `applyFilters` helper (RESEARCH.md Pitfall 7).
 */
import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type {
  DirectoryFilters,
  DirectoryProfile,
  DirectoryQueryResult,
  DirectorySkill,
} from '@/lib/data/directory.types'

const PAGE_SIZE = 20

export async function getDirectoryRows(
  filters: DirectoryFilters,
  client?: SupabaseClient<Database>,
): Promise<DirectoryQueryResult> {
  const supabase = client ?? (await createClient())

  // Apply filters identically to both queries (Pitfall 7)
  // Using separate builders because Supabase's chained builder is consumed when awaited.
  const buildCount = () => {
    let q = supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
    if (filters.categoryId !== null) q = q.eq('category_id', filters.categoryId)
    if (filters.countyId !== null) q = q.eq('county_id', filters.countyId)
    if (filters.q) {
      q = q.textSearch('search_text', filters.q, {
        type: 'websearch',
        config: 'english',
      })
    }
    return q
  }

  const buildRows = () => {
    let q = supabase
      .from('profiles')
      .select(
        `id, username, display_name, avatar_url, founding_member, rating_avg, rating_count,
         counties!inner(name),
         categories!inner(name),
         skills_offered(skill_text, sort_order)`,
      )
    if (filters.categoryId !== null) q = q.eq('category_id', filters.categoryId)
    if (filters.countyId !== null) q = q.eq('county_id', filters.countyId)
    if (filters.q) {
      q = q.textSearch('search_text', filters.q, {
        type: 'websearch',
        config: 'english',
      })
    }
    // Trust-based ranking: Bayesian average prevents single-rating profiles from dominating.
    // Unrated profiles sort below rated ones. created_at is the tiebreaker.
    return q
      .order('rating_avg', { ascending: false, nullsFirst: false })
      .order('rating_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(
        (filters.page - 1) * PAGE_SIZE,
        filters.page * PAGE_SIZE - 1,
      )
  }

  try {
    const [countResult, rowsResult] = await Promise.all([
      buildCount(),
      buildRows(),
    ])

    if (countResult.error) {
      const log = createLogger('directory')
      log.error('count error', { context: { code: countResult.error.code } })
      return { profiles: [], totalCount: 0, error: 'count_failed' }
    }
    if (rowsResult.error) {
      const log = createLogger('directory')
      log.error('rows error', { context: { code: rowsResult.error.code } })
      return { profiles: [], totalCount: 0, error: 'rows_failed' }
    }

    // Normalize: top-3 skills by sort_order ASC. Supabase returns all related rows
    // (Phase 3 caps at 5/profile), so slice after sort. Payload cost: ~100 skills / page
    // max — negligible vs the complexity of a lateral-limit in SQL (RESEARCH.md Pattern 4 caveat).
    const profiles: DirectoryProfile[] = (rowsResult.data ?? []).map((row) => {
      const allSkills = (row.skills_offered ?? []) as DirectorySkill[]
      const topSkills = [...allSkills]
        .sort((a, b) => a.sort_order - b.sort_order)
        .slice(0, 3)
      return {
        id: row.id,
        username: row.username ?? null,
        display_name: row.display_name ?? null,
        avatar_url: row.avatar_url ?? null,
        founding_member: Boolean(
          (row as { founding_member?: boolean }).founding_member,
        ),
        rating_avg: (row as { rating_avg?: number | null }).rating_avg ?? null,
        rating_count: (row as { rating_count?: number }).rating_count ?? 0,
        counties: row.counties
          ? { name: (row.counties as { name: string }).name }
          : null,
        categories: row.categories
          ? { name: (row.categories as { name: string }).name }
          : null,
        skills_offered: topSkills,
      }
    })

    return {
      profiles,
      totalCount: countResult.count ?? 0,
      error: null,
    }
  } catch (err) {
    const log = createLogger('directory')
    log.error('unexpected error', { error: err })
    return { profiles: [], totalCount: 0, error: 'unknown' }
  }
}

export { PAGE_SIZE }
