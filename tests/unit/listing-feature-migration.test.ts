import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260514150000_listing_featured_until.sql'),
  'utf8',
)

describe('listing feature migration', () => {
  it('adds featured_until to listings', () => {
    expect(migration).toContain('add column if not exists featured_until timestamptz;')
  })

  it('prioritizes featured listings in search ordering', () => {
    expect(migration).toContain('l.featured_until desc nulls last,')
  })

  it('adds a discover score bump for active featured listings', () => {
    expect(migration).toContain("case when l.featured_until is not null and l.featured_until > now() then 0.35 else 0.0 end")
  })
})
