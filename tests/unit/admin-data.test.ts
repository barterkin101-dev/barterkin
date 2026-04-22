/**
 * Phase 8 — ADMIN-01 + ADMIN-05 — admin data layer contract
 * Wave 0 stub. Plan 03 will fill in assertion bodies.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const hasAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const d = hasAdmin ? describe : describe.skip

d('ADMIN-01 — getAdminStats returns correct counts', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any
  const fixtureUserIds: string[] = []

  beforeAll(async () => {
    const mod = await import('@/lib/supabase/admin')
    admin = mod.supabaseAdmin
    // Plan 03: seed fixture profiles (published + unpublished + one created in last 7 days)
  }, 30_000)

  afterAll(async () => {
    for (const id of fixtureUserIds) await admin.auth.admin.deleteUser(id)
  }, 30_000)

  it.todo('returns totalMembers as integer ≥ 0')
  it.todo('returns totalContacts as integer ≥ 0')
  it.todo('returns newThisWeek counting only profiles created in the last 7 days')
})

d('ADMIN-05 — getAdminContacts filters by status', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any

  beforeAll(async () => {
    const mod = await import('@/lib/supabase/admin')
    admin = mod.supabaseAdmin
    // Plan 04: seed one contact_request with status='sent' and one with status='bounced'
  }, 30_000)

  afterAll(async () => {
    // Plan 04: cleanup seeded rows
  }, 30_000)

  it.todo('status=undefined returns rows of all statuses, newest first')
  it.todo('status=bounced returns only rows where status=bounced')
  it.todo('joins sender + recipient display_name via FK hints')

  // Smoke placeholder so the suite is non-empty while stubs are still placeholders
  it('module loads without throwing', async () => {
    const mod = await import('@/lib/data/admin')
    expect(typeof mod.getAdminStats).toBe('function')
    expect(typeof mod.getAdminMembers).toBe('function')
    expect(typeof mod.getAdminMemberById).toBe('function')
    expect(typeof mod.getAdminContacts).toBe('function')
    void admin
  })
})
