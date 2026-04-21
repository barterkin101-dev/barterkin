/**
 * Phase 4 — Directory type contracts
 *
 * Shared between:
 *   - lib/data/directory-params.ts  (URL → DirectoryFilters)
 *   - lib/data/directory.ts         (DirectoryFilters → rows + count)
 *   - components/directory/*        (props)
 *   - app/(app)/directory/page.tsx  (server component)
 *
 * Keep in sync with:
 *   - supabase/migrations/003_profile_tables.sql (profiles, skills_offered columns)
 *   - supabase/migrations/004_directory_search.sql (search_text column)
 *   - lib/data/categories.ts (CATEGORIES)
 *   - lib/data/georgia-counties.json (FIPS + names)
 */
import type { CategorySlug } from '@/lib/data/categories'

export interface DirectoryFilters {
  categorySlug: CategorySlug | null
  categoryId: number | null
  countyFips: number | null
  countyId: number | null    // counties.id === fips (Phase 3 D-01)
  countyName: string | null
  q: string | null           // already trimmed + length-validated (>= 2 and <= 100); else null
  page: number               // >= 1; garbage input → 1
  activeFilterCount: number  // count of (categorySlug, countyFips, q) that are non-null
}

export interface DirectorySkill {
  skill_text: string
  sort_order: number
}

export interface DirectoryProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  counties: { name: string } | null
  categories: { name: string } | null
  skills_offered: DirectorySkill[]
}

export interface DirectoryQueryResult {
  profiles: DirectoryProfile[]
  totalCount: number
  error: string | null
}
