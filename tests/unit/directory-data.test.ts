/**
 * Phase 4 — DIR-02, DIR-03, DIR-04, DIR-05 — getDirectoryRows data-layer contract
 *
 * Wave 0 stub. Plan 03 fills the bodies.
 */
import { describe, it, expect } from 'vitest'

const hasAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const d = hasAdmin ? describe : describe.skip

d('DIR-02/03/04/05 — getDirectoryRows', () => {
  it.skip('returns profiles + totalCount with no filters applied', () => {
    expect(true).toBe(true) // TODO Plan 03
  })
  it.skip('applies category_id filter when categoryId is set', () => {
    expect(true).toBe(true) // TODO Plan 03
  })
  it.skip('applies county_id filter when countyId is set', () => {
    expect(true).toBe(true) // TODO Plan 03
  })
  it.skip('applies FTS keyword filter via textSearch on search_text', () => {
    expect(true).toBe(true) // TODO Plan 03
  })
  it.skip('fuzzy match: typo "bakng" returns a baking profile (DIR-05 pg_trgm)', () => {
    expect(true).toBe(true) // TODO Plan 03
  })
  it.skip('truncates skills_offered to top 3 by sort_order ASC', () => {
    expect(true).toBe(true) // TODO Plan 03
  })
  it.skip('paginates 20 per page via range((page-1)*20, page*20-1)', () => {
    expect(true).toBe(true) // TODO Plan 03
  })
})
