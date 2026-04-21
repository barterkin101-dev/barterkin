/**
 * Phase 4 — URL search-param parsing + validation
 *
 * Parses Next.js 16 searchParams (already awaited) into a typed DirectoryFilters
 * object. Silently drops invalid values — the page never 500s on a bookmark URL
 * whose slugs have drifted (design decision per RESEARCH.md Assumption A10).
 *
 * Depends on:
 *   - lib/data/categories.ts (CATEGORIES)
 *   - lib/data/georgia-counties.json (fips table)
 *   - lib/data/directory.types.ts (DirectoryFilters contract)
 */
import { CATEGORIES, type CategorySlug } from '@/lib/data/categories'
import georgiaCounties from '@/lib/data/georgia-counties.json'
import type { DirectoryFilters } from '@/lib/data/directory.types'

export const MAX_Q_LENGTH = 100
export const MIN_Q_LENGTH = 2

type RawParams = Record<string, string | string[] | undefined>

function take(raw: RawParams, key: string): string | undefined {
  const v = raw[key]
  if (Array.isArray(v)) return v[0]
  return v
}

export function parseSearchParams(raw: RawParams): DirectoryFilters {
  // Category slug → id (silent drop on unknown)
  const rawCategory = take(raw, 'category')
  const category =
    (rawCategory && CATEGORIES.find((c) => c.slug === rawCategory)) || null

  // County fips → id + name (silent drop on unknown)
  const rawCounty = take(raw, 'county')
  const fipsNum = rawCounty ? Number.parseInt(rawCounty, 10) : Number.NaN
  const county = Number.isFinite(fipsNum)
    ? (georgiaCounties as Array<{ fips: number; name: string }>).find(
        (c) => c.fips === fipsNum,
      ) ?? null
    : null

  // Keyword — trim, length-gate, clamp
  const rawQ = take(raw, 'q')?.trim()
  const q =
    rawQ && rawQ.length >= MIN_Q_LENGTH ? rawQ.slice(0, MAX_Q_LENGTH) : null

  // Page — fall back to 1 on any non-positive-integer input
  const rawPage = take(raw, 'page')
  const parsed = rawPage ? Number.parseInt(rawPage, 10) : 1
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1

  const activeFilterCount =
    (category ? 1 : 0) + (county ? 1 : 0) + (q ? 1 : 0)

  return {
    categorySlug: (category?.slug as CategorySlug | undefined) ?? null,
    categoryId: category?.id ?? null,
    countyFips: county?.fips ?? null,
    countyId: county?.fips ?? null, // counties.id === fips (Phase 3 D-01)
    countyName: county?.name ?? null,
    q,
    page,
    activeFilterCount,
  }
}
