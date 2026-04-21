/**
 * Phase 4 — DIR-09 — RLS contract: only published + verified + not-banned profiles are returned
 *
 * Wave 0 stub. Plan 03 fills the bodies.
 * Setup pattern: see tests/unit/rls-email-verify.test.ts.
 */
import { describe, it, expect } from 'vitest'

const hasAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const d = hasAdmin ? describe : describe.skip

d('DIR-09 — RLS directory visibility', () => {
  it.skip('excludes profiles where is_published = false', () => {
    expect(true).toBe(true) // TODO Plan 03: seed unpublished profile, query as authed user, assert absent
  })
  it.skip('excludes profiles where banned = true', () => {
    expect(true).toBe(true) // TODO Plan 03: seed banned profile, assert absent
  })
  it.skip('excludes profiles whose owner is email-unverified', () => {
    expect(true).toBe(true) // TODO Plan 03: seed unverified-owner profile, assert absent
  })
  it.skip('includes profiles that are published + verified + not banned', () => {
    expect(true).toBe(true) // TODO Plan 03: seed valid profile, assert present
  })
})
