/**
 * Public category data layer — member counts and top skills per category.
 *
 * Used by the public /categories page (no auth required).
 */
import 'server-only'
import { createLogger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/data/categories'

export interface CategoryStat {
  id: number
  name: string
  slug: string
  memberCount: number
  listingCount: number
  topSkills: string[]
}

export interface CategoryStatsResult {
  categories: CategoryStat[]
  totalMembers: number
  totalListings: number
  error: string | null
}

export async function getCategoryStats(): Promise<CategoryStatsResult> {
  const supabase = await createClient()
  const log = createLogger('categories-public')

  try {
    // Fetch published profile counts per category
    const { data: profileRows, error: profileErr } = await supabase
      .from('profiles')
      .select('category_id')
      .eq('is_published', true)
      .eq('banned', false)

    if (profileErr) {
      log.error('profile count error', { context: { code: profileErr.code } })
      return { categories: [], totalMembers: 0, totalListings: 0, error: 'profiles_failed' }
    }

    // Fetch active listing counts per category
    const { data: listingRows, error: listingErr } = await supabase
      .from('listings')
      .select('category_id')
      .eq('status', 'active')

    if (listingErr) {
      log.error('listing count error', { context: { code: listingErr.code } })
      return { categories: [], totalMembers: 0, totalListings: 0, error: 'listings_failed' }
    }

    // Fetch top skills per category (most frequent skill_text among published profiles)
    const { data: skillRows, error: skillErr } = await supabase
      .from('skills_offered')
      .select('skill_text, profiles!inner(category_id, is_published, banned)')
      .eq('profiles.is_published', true)
      .eq('profiles.banned', false)
      .limit(200)

    if (skillErr) {
      log.error('skills query error', { context: { code: skillErr.code } })
      // Non-fatal: continue without top skills
    }

    // Aggregate counts
    const profileCounts = new Map<number, number>()
    for (const row of profileRows ?? []) {
      if (row.category_id != null) {
        profileCounts.set(row.category_id, (profileCounts.get(row.category_id) ?? 0) + 1)
      }
    }

    const listingCounts = new Map<number, number>()
    for (const row of listingRows ?? []) {
      if (row.category_id != null) {
        listingCounts.set(row.category_id, (listingCounts.get(row.category_id) ?? 0) + 1)
      }
    }

    // Aggregate top skills per category
    const skillsByCategory = new Map<number, Map<string, number>>()
    for (const row of skillRows ?? []) {
      const profile = row.profiles as { category_id: number | null } | null
      const categoryId = profile?.category_id
      if (categoryId == null) continue
      const skillText = (row as { skill_text: string }).skill_text
      if (!skillText) continue
      const catMap = skillsByCategory.get(categoryId) ?? new Map<string, number>()
      catMap.set(skillText, (catMap.get(skillText) ?? 0) + 1)
      skillsByCategory.set(categoryId, catMap)
    }

    const categories: CategoryStat[] = CATEGORIES.map((cat) => {
      const skillMap = skillsByCategory.get(cat.id)
      const topSkills = skillMap
        ? Array.from(skillMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([text]) => text)
        : []

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        memberCount: profileCounts.get(cat.id) ?? 0,
        listingCount: listingCounts.get(cat.id) ?? 0,
        topSkills,
      }
    })

    const totalMembers = Array.from(profileCounts.values()).reduce((a, b) => a + b, 0)
    const totalListings = Array.from(listingCounts.values()).reduce((a, b) => a + b, 0)

    return { categories, totalMembers, totalListings, error: null }
  } catch (err) {
    log.error('unexpected error', { error: err })
    return { categories: [], totalMembers: 0, totalListings: 0, error: 'unknown' }
  }
}
